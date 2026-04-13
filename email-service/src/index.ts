import {sendVerificationEmail} from './sender.ts'

interface RequestBody {
  email?: unknown
  code?: unknown
}

interface ValidBody {
  email: string
  code: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validate(body: RequestBody): ValidBody | null {
  if (!isNonEmptyString(body.email)) return null
  if (!isNonEmptyString(body.code)) return null
  return {email: body.email, code: body.code}
}

async function parseBody(request: Request): Promise<RequestBody | null> {
  try {
    return (await request.json()) as RequestBody
  } catch {
    return null
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'}
  })
}

export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname !== '/') return new Response('Not Found', {status: 404})
  if (request.method !== 'POST')
    return new Response('Method Not Allowed', {status: 405})

  const body = await parseBody(request)
  if (!body) return json(400, {error: 'Invalid JSON body'})

  const valid = validate(body)
  if (!valid) return json(400, {error: 'email and code are required'})

  const result = await sendVerificationEmail(valid.email, valid.code)
  if (!result.ok) return json(500, {error: result.error})
  return new Response(null, {status: 204})
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3001)
  Bun.serve({port, fetch: handle})
  console.log(`Email service listening on port ${port}`)
}
