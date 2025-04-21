const CACHE_NAME = 'mellon-cache-v1'
const urlsToCache = ['/']

const isDev = self.location.hostname === 'localhost'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isBunAsset = url.pathname.startsWith('/_bun/')
  console.log(`url.pathname: ${url.pathname}`)
  console.log(`isBunAsset: ${isBunAsset}`)

  if (isDev && isBunAsset) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy of the response
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
        .catch(() => {
          // Try to get it from cache if network fails
          return caches.match(event.request)
        })
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response
      }

      // Clone the request because it can only be used once
      const fetchRequest = event.request.clone()

      return fetch(fetchRequest)
        .then((response) => {
          // Check if response is valid
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response
          }

          // Clone response because it can only be used once
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Return fallback content when offline
          if (event.request.mode === 'navigate') {
            return (
              caches.match('/') ||
              new Response('You are offline. Please check your connection.', {
                headers: {'Content-Type': 'text/html'},
                status: 200
              })
            )
          }
          return new Response('', {status: 404})
        })
    })
  )
})

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})
