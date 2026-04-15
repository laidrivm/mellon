import {
  EMAIL_VERIFICATION,
  ERROR_MESSAGES,
  getEmailServiceUrl
} from './config.ts'
import type {CouchClient} from './couch-client.ts'
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

export interface EmailVerificationDeps {
  client?: CouchClient
  sendEmail?: (email: string, code: string) => Promise<boolean>
  now?: () => number
  rateLimiter?: Map<string, number[]>
}

const defaultRateLimiter = new Map<string, number[]>()

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

function checkRateLimit(
  limiter: Map<string, number[]>,
  email: string,
  now: number
): boolean {
  const window = EMAIL_VERIFICATION.RATE_LIMIT_WINDOW_MS
  const max = EMAIL_VERIFICATION.RATE_LIMIT_MAX
  const hits = (limiter.get(email) ?? []).filter((t) => now - t < window)
  if (hits.length >= max) {
    limiter.set(email, hits)
    return false
  }
  hits.push(now)
  limiter.set(email, hits)
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
  const limiter = deps.rateLimiter ?? defaultRateLimiter
  if (!checkRateLimit(limiter, email, now)) {
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

export {defaultRateLimiter as _defaultRateLimiter}
