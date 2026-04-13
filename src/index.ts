import {dirname, join} from 'node:path'
import {file, serve} from 'bun'
import {initUsersDb} from './api/db/users.ts'
import {requestEmailCode, verifyEmailCode} from './api/email-verification.ts'
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

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

const apiRoutes = {
  '/api/generate-uuid': {
    POST: async () => json(await generateUUID())
  },
  '/api/auth/email/request': {
    POST: async (req: Request) => {
      const body = await readJson(req)
      const email = typeof body?.['email'] === 'string' ? body['email'] : ''
      const result = await requestEmailCode(email)
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: {'Content-Type': 'application/json'}
      })
    }
  },
  '/api/auth/email/verify': {
    POST: async (req: Request) => {
      const body = await readJson(req)
      const email = typeof body?.['email'] === 'string' ? body['email'] : ''
      const code = typeof body?.['code'] === 'string' ? body['code'] : ''
      const result = await verifyEmailCode(email, code)
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: {'Content-Type': 'application/json'}
      })
    }
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

try {
  await initUsersDb()
} catch (err) {
  console.error('[initUsersDb] failed:', err)
}

const server = serve({
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  port: process.env['PORT'],
  routes: {
    ...apiRoutes,
    ...(isProduction ? prodStaticRoutes : devStaticRoutes)
    // biome-ignore lint/suspicious/noExplicitAny: dev route table includes an HTMLBundle, prod doesn't
  } as any,
  development: !isProduction
})

console.log(`🚀 Server running at ${server.url}`)
