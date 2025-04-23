const CACHE_NAME = 'mellon-cache-v1'
const urlsToCache = ['/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  // For HTML documents (navigation requests), always go to network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache valid responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response
          }
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
        .catch(() => {
          // Offline fallback for navigation
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

  // For other assets, check cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      // Clone the request because it's a stream
      const fetchRequest = event.request.clone()
      return fetch(fetchRequest)
        .then((response) => {
          // Skip opaque or error responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response
          }
          // Clone the response before caching
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
          return response
        })
        .catch(() => {
          // Return a 404 fallback for non-navigation resources
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
