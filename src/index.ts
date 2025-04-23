import {serve} from 'bun'
import {file} from 'bun'
import index from './index.html'
import generateUUID from './methods/generate-uuid.ts'

const server = serve({
  port: 3001,
  routes: {
    '/service-worker.js': () => new Response(file('./src/service-worker.js')),
    '/api/generate-uuid': {
      POST: async (req) => {
        return await generateUUID(req)
      }
    },
    '/*': index
  },
  development: process.env.NODE_ENV !== 'production'
})

console.log(`🚀 Server running at ${server.url}`)
