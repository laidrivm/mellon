import {dirname, join} from 'node:path'
import {file, serve} from 'bun'
import {generateUUID} from './api/generate-uuid.ts'
// HTML import for dev mode - Bun auto-bundles TSX/CSS
import index from './app/assets/index.html'

// biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
const isProduction = String(process.env['NODE_ENV']) === 'production'

// In production, serve from dist/public (relative to built script)
const publicDir = join(dirname(Bun.main), 'public')

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })

const apiRoutes = {
  '/api/generate-uuid': {
    POST: async () => json(await generateUUID())
  }
}

const prodStaticRoutes = {
  '/service-worker.js': () =>
    new Response(file(`${publicDir}/service-worker.js`)),
  '/*': {
    GET: (req: Request) => {
      const {pathname} = new URL(req.url)
      const path = pathname === '/' ? '/index.html' : pathname
      return new Response(file(`${publicDir}${path}`))
    }
  }
}

const devStaticRoutes = {
  '/service-worker.js': () =>
    new Response(file('./src/app/assets/service-worker.js')),
  // Bun's HTML import handles TSX transpilation & hot reload
  '/': index
}

const server = serve({
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  port: process.env['PORT'],
  // biome-ignore lint/suspicious/noExplicitAny: dev route table includes an HTMLBundle, prod doesn't
  routes: {
    ...apiRoutes,
    ...(isProduction ? prodStaticRoutes : devStaticRoutes)
  } as any,
  development: !isProduction
})

console.log(`🚀 Server running at ${server.url}`)
