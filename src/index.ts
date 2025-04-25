import {serve} from 'bun'
import {file} from 'bun'
import index from './index.html'
import {generateUUID} from './api/generate-uuid.ts'

const server = serve({
  port: 3001,
  routes: {
    '/service-worker.js': () => new Response(file('./src/service-worker.js')),
    '/api/generate-uuid': {
      POST: async (req) => {
        const res = await generateUUID(req)
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
  development: process.env.NODE_ENV !== 'production'
})

console.log(`🚀 Server running at ${server.url}`)
