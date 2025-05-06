const CACHE_NAME = 'mellon-cache-v2'
const STATIC_URLS_TO_CACHE = ['/', '/service-worker.js']
const NEVER_CACHE = ['/api/generate-uuid']

// Cache patterns for dynamic assets
const DYNAMIC_CACHE_PATTERNS = [
  {urlPattern: '/_bun/asset/', cacheName: 'bun-assets'},
  {urlPattern: '/_bun/client/', cacheName: 'bun-client'},
  {urlPattern: 'fonts.googleapis.com', cacheName: 'google-fonts-css'},
  {urlPattern: 'fonts.gstatic.com', cacheName: 'google-fonts-assets'}
]

// Helper function to determine the appropriate cache for a request
function getCacheNameForRequest(url) {
  if (typeof url === 'object' && url.url) {
    url = url.url
  }

  for (const pattern of DYNAMIC_CACHE_PATTERNS) {
    if (url.includes(pattern.urlPattern)) {
      return pattern.cacheName
    }
  }

  return CACHE_NAME // Default cache
}

// Install event - precache static assets, intercept network requests during installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_URLS_TO_CACHE))
      .then(() => self.skipWaiting()) // Activate immediately
  )
})

// Activate event - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [
    CACHE_NAME,
    ...DYNAMIC_CACHE_PATTERNS.map((pattern) => pattern.cacheName)
  ]

  event.waitUntil(
    Promise.all([
      // Clean up old caches but keep the dynamic ones
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  )

  // Notify all clients that the service worker is active
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({type: 'SW_ACTIVATED'})
    })
  })
})

// Network request interceptor
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request))
    return
  }

  // Never cache certain API requests
  if (NEVER_CACHE.some((url) => event.request.url.includes(url))) {
    event.respondWith(fetch(event.request))
    return
  }

  // Special handling for navigation requests (HTML documents)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            // Clear old versions of the same page
            const url = new URL(event.request.url)
            const pageUrlPattern = url.origin + url.pathname

            cache.keys().then((keys) => {
              keys.forEach((key) => {
                const keyUrl = new URL(key.url)
                if (keyUrl.origin + keyUrl.pathname === pageUrlPattern) {
                  cache.delete(key)
                }
              })
              cache.put(event.request, responseToCache)
            })
          })

          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return (
              cachedResponse ||
              caches.match('/') ||
              new Response('You are offline. Please check your connection.', {
                headers: {'Content-Type': 'text/html'},
                status: 200
              })
            )
          })
        })
    )
    return
  }

  // For all other requests, use a "cache and network race" strategy
  const cacheName = getCacheNameForRequest(event.request.url)

  event.respondWith(
    Promise.race([
      // Network request
      fetch(event.request).then((networkResponse) => {
        // Cache valid responses as we get them
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const clonedResponse = networkResponse.clone()
          caches.open(cacheName).then((cache) => {
            cache.put(event.request, clonedResponse)
          })
        }
        return networkResponse
      }),

      // Cache lookup (with a slight delay to give network a chance to win if it's fast)
      new Promise((resolve) => {
        setTimeout(() => {
          caches
            .open(cacheName)
            .then((cache) => cache.match(event.request))
            .then((cachedResponse) => {
              if (cachedResponse) {
                resolve(cachedResponse)
              }
            })
        }, 20) // Small delay to prioritize network if it's fast
      })
    ]).catch(() => {
      // Fallback to cache if both fail
      return caches
        .open(cacheName)
        .then((cache) => cache.match(event.request))
        .then((cachedResponse) => {
          return cachedResponse || new Response('', {status: 404})
        })
    })
  )
})

// Handle messages from clients
self.addEventListener('message', (event) => {
  // Handle "skipWaiting" message
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }

  // Handle "cacheAssets" message with an array of URLs to cache
  if (
    event.data &&
    event.data.type === 'CACHE_ASSETS' &&
    Array.isArray(event.data.assets)
  ) {
    const assets = event.data.assets
    //console.log('[ServiceWorker] Caching assets:', assets);

    // Process assets in batches to avoid overwhelming the browser
    const batchSize = 5
    const assetBatches = []

    // Split into batches
    for (let i = 0; i < assets.length; i += batchSize) {
      assetBatches.push(assets.slice(i, i + batchSize))
    }

    // Process each batch sequentially
    event.waitUntil(
      (async () => {
        for (const batch of assetBatches) {
          await Promise.all(
            batch.map(async (assetUrl) => {
              try {
                const cacheName = getCacheNameForRequest(assetUrl)
                const cache = await caches.open(cacheName)

                // Check if already cached
                const isCached = await cache.match(assetUrl)
                if (!isCached) {
                  const response = await fetch(assetUrl, {
                    credentials: 'same-origin'
                  })
                  if (response && response.status === 200) {
                    return cache.put(assetUrl, response)
                  }
                }
              } catch (error) {
                console.error(
                  '[ServiceWorker] Failed to cache:',
                  assetUrl,
                  error
                )
              }
            })
          )
        }
      })()
    )
  }
})
