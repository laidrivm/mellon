import {
  COUCHDB_CONSTANTS,
  EMAIL_VERIFICATION,
  ERROR_MESSAGES,
  getEmailServiceUrl
} from './config.ts'
import {
  type CouchClient,
  createCouchClient,
  isConflictError
} from './couch-client.ts'
import {
  codeDocId,
  deleteVerificationCode,
  getVerificationCode,
  incrementCodeAttempts,
  markUserVerified,
  upsertVerificationCode,
  type VerificationCodeDoc
} from './db/users.ts'

export interface RequestResult {
  success: boolean
  error?: string
}

export interface VerifyResult {
  success: boolean
  userId?: string
  error?: string
}

export interface RateLimitStore {
  load: (email: string) => Promise<number[]>
  save: (email: string, hits: number[]) => Promise<void>
}

export interface EmailVerificationDeps {
  client?: CouchClient
  sendEmail?: (email: string, code: string) => Promise<boolean>
  now?: () => number
  rateLimitStore?: RateLimitStore
}

interface RateLimitDoc {
  _id: string
  _rev?: string
  type: typeof COUCHDB_CONSTANTS.RATE_LIMIT_TYPE
  hits: number[]
}

function rlDocId(email: string): string {
  return `${COUCHDB_CONSTANTS.RATE_LIMIT_DOC_PREFIX}${email}`
}

export function createMemoryRateLimitStore(): RateLimitStore {
  const map = new Map<string, number[]>()
  return {
    load: async (email) => map.get(email) ?? [],
    save: async (email, hits) => {
      map.set(email, hits)
    }
  }
}

// Couch-backed store. Conflicts on save are swallowed: under concurrent
// requests the limiter may let a few extra hits through, which self-corrects
// once load/save sees the newer rev — acceptable for rate limiting.
export function createCouchRateLimitStore(
  client: CouchClient,
  dbName: string = COUCHDB_CONSTANTS.USERS_APP_DB
): RateLimitStore {
  return {
    load: async (email) => {
      const doc = await client.findDoc<RateLimitDoc>(dbName, rlDocId(email))
      return doc?.hits ?? []
    },
    save: async (email, hits) => {
      const existing = await client.findDoc<RateLimitDoc>(
        dbName,
        rlDocId(email)
      )
      const doc: RateLimitDoc = {
        _id: rlDocId(email),
        _rev: existing?._rev,
        type: COUCHDB_CONSTANTS.RATE_LIMIT_TYPE,
        hits
      }
      try {
        await client.updateDoc(dbName, doc)
      } catch (err) {
        if (!isConflictError(err)) throw err
      }
    }
  }
}

function isValidEmail(email: string): boolean {
  return EMAIL_VERIFICATION.EMAIL_REGEX.test(email)
}

function generateCode(): string {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  const n = (bytes[0] ?? 0) % 10 ** EMAIL_VERIFICATION.CODE_LENGTH
  return n.toString().padStart(EMAIL_VERIFICATION.CODE_LENGTH, '0')
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function checkRateLimit(
  store: RateLimitStore,
  email: string,
  now: number
): Promise<boolean> {
  const window = EMAIL_VERIFICATION.RATE_LIMIT_WINDOW_MS
  const max = EMAIL_VERIFICATION.RATE_LIMIT_MAX
  const fresh = (await store.load(email)).filter((t) => now - t < window)
  if (fresh.length >= max) {
    await store.save(email, fresh)
    return false
  }
  await store.save(email, [...fresh, now])
  return true
}

async function sendViaEmailService(
  email: string,
  code: string
): Promise<boolean> {
  try {
    const res = await fetch(`${getEmailServiceUrl()}/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, code})
    })
    return res.ok
  } catch (err) {
    console.error('[EmailService] send failed:', err)
    return false
  }
}

export async function requestEmailCode(
  email: string,
  deps: EmailVerificationDeps = {}
): Promise<RequestResult> {
  if (!isValidEmail(email)) {
    return {success: false, error: ERROR_MESSAGES.INVALID_EMAIL}
  }

  const now = deps.now?.() ?? Date.now()
  const store =
    deps.rateLimitStore ??
    createCouchRateLimitStore(deps.client ?? createCouchClient())
  if (!(await checkRateLimit(store, email, now))) {
    return {success: true}
  }

  const code = generateCode()
  const codeHash = await sha256Hex(code)
  const existing = await getVerificationCode(email, deps)
  const doc: VerificationCodeDoc = {
    _id: codeDocId(email),
    _rev: existing?._rev,
    type: 'verification_code',
    email,
    codeHash,
    attempts: 0,
    expiresAt: new Date(now + EMAIL_VERIFICATION.CODE_TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString()
  }
  await upsertVerificationCode(doc, deps)

  const send = deps.sendEmail ?? sendViaEmailService
  const sent = await send(email, code)
  if (!sent) {
    return {success: false, error: ERROR_MESSAGES.EMAIL_SEND_FAILED}
  }
  return {success: true}
}

export async function verifyEmailCode(
  email: string,
  code: string,
  deps: EmailVerificationDeps & {userId?: string} = {}
): Promise<VerifyResult> {
  if (!isValidEmail(email) || !code) {
    return {success: false, error: ERROR_MESSAGES.INVALID_CODE}
  }

  const doc = await getVerificationCode(email, deps)
  if (!doc) return {success: false, error: ERROR_MESSAGES.INVALID_CODE}

  const now = deps.now?.() ?? Date.now()
  if (new Date(doc.expiresAt).getTime() <= now) {
    await deleteVerificationCode(doc, deps)
    return {success: false, error: ERROR_MESSAGES.CODE_EXPIRED}
  }
  if (doc.attempts >= EMAIL_VERIFICATION.MAX_ATTEMPTS) {
    await deleteVerificationCode(doc, deps)
    return {success: false, error: ERROR_MESSAGES.TOO_MANY_ATTEMPTS}
  }

  const codeHash = await sha256Hex(code)
  if (codeHash !== doc.codeHash) {
    await incrementCodeAttempts(doc, deps)
    return {success: false, error: ERROR_MESSAGES.INVALID_CODE}
  }

  await deleteVerificationCode(doc, deps)
  const userId = await markUserVerified(email, deps)
  return {success: true, userId}
}
