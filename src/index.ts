import {dirname, join} from 'node:path'
import {file, serve} from 'bun'
import {generateUUID} from './api/generate-uuid.ts'

// Detect production mode at runtime based on NODE_ENV
// biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
const isProduction = String(process.env['NODE_ENV']) === 'production'

// In production, serve from dist/public; in dev, use source directory
const scriptDir = dirname(Bun.main)
const publicDir = isProduction ? join(scriptDir, 'public') : './src'

const server = serve({
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  port: process.env['PORT'],
  routes: {
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
    // Serve all static files from public directory
    '/*': {
      GET: (req) => {
        const url = new URL(req.url)
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname
        return new Response(file(`${publicDir}${pathname}`))
      }
    }
  },
  development: !isProduction
})

console.log(`🚀 Server running at ${server.url}`)
