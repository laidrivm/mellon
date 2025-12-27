import {dirname, join} from 'node:path'
import {file, serve} from 'bun'
import {generateUUID} from './api/generate-uuid.ts'
// HTML import for dev mode - Bun auto-bundles TSX/CSS
import index from './index.html'

// Detect production mode at runtime based on NODE_ENV
// biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
const isProduction = String(process.env['NODE_ENV']) === 'production'

// In production, serve from dist/public (relative to built script)
const scriptDir = dirname(Bun.main)
const publicDir = join(scriptDir, 'public')

// Production routes - serve pre-built static files
const productionRoutes = {
  '/service-worker.js': () => new Response(file(`${publicDir}/service-worker.js`)),
  '/api/generate-uuid': {
    POST: async () => {
      const res = await generateUUID()
      return new Response(JSON.stringify(res), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  },
  '/*': {
    GET: (req: Request) => {
      const url = new URL(req.url)
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname
      return new Response(file(`${publicDir}${pathname}`))
    }
  }
}

// Development routes - use Bun's HTML bundling for hot reload
const developmentRoutes = {
  '/service-worker.js': () => new Response(file('./src/service-worker.js')),
  '/api/generate-uuid': {
    POST: async () => {
      const res = await generateUUID()
      return new Response(JSON.stringify(res), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
  },
  '/': index // Bun's HTML import handles TSX transpilation & hot reload
}

const server = serve({
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  port: process.env['PORT'],
  // biome-ignore lint/suspicious/noExplicitAny: routes differ between dev/prod
  routes: (isProduction ? productionRoutes : developmentRoutes) as any,
  development: !isProduction
})

console.log(`🚀 Server running at ${server.url}`)
