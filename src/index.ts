import {file, serve} from 'bun'
import {generateUUID} from './api/generate-uuid.ts'
import index from './index.html'

const server = serve({
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  port: process.env['PORT'],
  routes: {
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
    '/': index
  },
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  development: process.env['NODE_ENV'] !== 'production'
})

console.log(`🚀 Server running at ${server.url}`)
