import {serve} from 'bun'
import index from './index.html'

const server = serve({
  port: 3001,
  routes: {
    // Serve index.html for all unmatched routes.
    '/*': index,

    '/api/hello': {
      async GET() {
        return Response.json({
          message: 'Hello, world!',
          method: 'GET'
        })
      },
      async PUT() {
        return Response.json({
          message: 'Hello, world!',
          method: 'PUT'
        })
      }
    },

    '/api/hello/:name': async (req) => {
      const name = req.params.name
      return Response.json({
        message: `Hello, ${name}!`
      })
    }
  },

  development: process.env.NODE_ENV !== 'production'
})

console.log(`🚀 Server running at ${server.url}`)
