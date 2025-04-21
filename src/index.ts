import {serve} from 'bun'
import {file} from 'bun'
import index from './index.html'

const server = serve({
  port: 3001,
  routes: {
    '/service-worker.js': () => new Response(file('./src/service-worker.js')),
    '/*': index
  },
  development: process.env.NODE_ENV !== 'production'
})

console.log(`🚀 Server running at ${server.url}`)
