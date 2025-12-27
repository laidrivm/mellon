/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import {createRoot} from 'react-dom/client'
import App from './components/App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found in the document')
}
const app = <App />

// Function to detect and cache all current resources in the page
function cachePageResources() {
  if (!navigator.serviceWorker.controller) {
    // Service worker not yet controlling page, try again in a moment
    setTimeout(cachePageResources, 100)
    return
  }

  // Collect all resources used by the current page
  const resources = [
    // The current page URL
    window.location.href,

    // CSS files
    ...Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    ).map((link) => link.href),

    // Scripts
    ...Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src]')
    ).map((script) => script.src),

    // Images
    ...Array.from(document.querySelectorAll<HTMLImageElement>('img[src]'))
      .map((img) => img.src)
      .filter((src) => src?.startsWith('http')),

    // Preloaded resources
    ...Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="preload"]')
    ).map((link) => link.href),

    // Font stylesheets specifically (often missed)
    ...Array.from(
      document.querySelectorAll<HTMLLinkElement>(
        'link[rel="stylesheet"][href*="fonts"]'
      )
    ).map((link) => link.href)
  ].filter(Boolean) // Remove null/undefined entries

  // Check the network requests that have been made
  if (performance?.getEntriesByType) {
    const networkResources = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter(
        (url) =>
          url.includes('/_bun/') ||
          url.includes('fonts.googleapis.com') ||
          url.includes('fonts.gstatic.com') ||
          url.endsWith('.svg') ||
          url.endsWith('.css') ||
          url.endsWith('.js')
      )

    resources.push(...networkResources)
  }

  // Remove duplicates
  const uniqueResources = [...new Set(resources)]

  // Send the resources to the service worker for caching
  if (navigator.serviceWorker.controller && uniqueResources.length > 0) {
    //console.log('Sending resources to cache:', uniqueResources);

    // Use MessageChannel for reliable communication
    const messageChannel = new MessageChannel()
    messageChannel.port1.onmessage = (event) => {
      if (event.data?.success) {
        console.log('Service worker acknowledged asset caching request')
      }
    }

    navigator.serviceWorker.controller.postMessage(
      {
        type: 'CACHE_ASSETS',
        assets: uniqueResources
      },
      [messageChannel.port2]
    )
  }
}

// Initial service worker registration
if ('serviceWorker' in navigator) {
  // Register service worker as early as possible
  navigator.serviceWorker
    .register('/service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope)

      // Force update if there's a new service worker
      if (registration.waiting) {
        registration.waiting.postMessage('skipWaiting')
      }
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error)
    })

  // Set up message listeners
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_ACTIVATED') {
      console.log('Service Worker activated and ready to cache resources')
      // Cache resources when service worker is active
      cachePageResources()
    }
  })

  // If service worker is already controlling, cache resources immediately
  if (navigator.serviceWorker.controller) {
    window.addEventListener('load', cachePageResources)
  } else {
    // If no controller yet, register the callback for later
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      cachePageResources()
    })
  }
}

// Additionally, cache resources when page load completes to catch resources loaded later
window.addEventListener('load', () => {
  setTimeout(cachePageResources, 1000)
})

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  if (!import.meta.hot.data.root) {
    import.meta.hot.data.root = createRoot(rootElement)
  }
  import.meta.hot.data.root.render(app)
} else {
  // The hot module reloading API is not available in production.
  createRoot(rootElement).render(app)
}
