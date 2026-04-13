import {beforeEach, describe, expect, mock, test} from 'bun:test'
import {EMAIL_VERIFICATION, ERROR_MESSAGES} from './config.ts'
import type {CouchClient} from './couch-client.ts'
import type {VerificationCodeDoc} from './db/users.ts'
import {
  _defaultRateLimiter,
  requestEmailCode,
  verifyEmailCode
} from './email-verification.ts'

function findDocMock<T>(value: T | null) {
  return mock(async () => value) as unknown as CouchClient['findDoc']
}

function findByMangoMock<T>(values: T[]) {
  return mock(async () => values) as unknown as CouchClient['findByMango']
}

function makeClient(overrides: Partial<CouchClient> = {}): CouchClient {
  return {
    createDb: mock(async () => undefined),
    ensureDb: mock(async () => undefined),
    ensureIndex: mock(async () => undefined),
    insertDoc: mock(async () => ({ok: true, id: 'id', rev: '1-a'})),
    updateDoc: mock(async () => ({ok: true, id: 'id', rev: '1-a'})),
    findDoc: findDocMock(null),
    findByMango: findByMangoMock([]),
    deleteDoc: mock(async () => undefined),
    putSecurity: mock(async () => true),
    ...overrides
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

beforeEach(() => {
  _defaultRateLimiter.clear()
})

describe('requestEmailCode', () => {
  test('rejects invalid email format', async () => {
    const client = makeClient()
    const sendEmail = mock(async () => true)
    const res = await requestEmailCode('not-an-email', {client, sendEmail})
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.INVALID_EMAIL)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('generates code, saves doc, calls email service on happy path', async () => {
    const client = makeClient()
    const sendEmail = mock(async () => true)
    const res = await requestEmailCode('user@example.com', {client, sendEmail})
    expect(res.success).toBe(true)
    expect(client.updateDoc).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const call = sendEmail.mock.calls[0] as unknown as [string, string]
    expect(call[0]).toBe('user@example.com')
    expect(call[1]).toMatch(/^\d{6}$/)
  })

  test('returns error when email service fails', async () => {
    const client = makeClient()
    const sendEmail = mock(async () => false)
    const res = await requestEmailCode('user@example.com', {client, sendEmail})
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.EMAIL_SEND_FAILED)
  })

  test('silently drops 4th request within rate-limit window', async () => {
    const client = makeClient()
    const sendEmail = mock(async () => true)
    const rateLimiter = new Map<string, number[]>()
    const email = 'user@example.com'
    for (let i = 0; i < EMAIL_VERIFICATION.RATE_LIMIT_MAX; i++) {
      await requestEmailCode(email, {client, sendEmail, rateLimiter})
    }
    expect(sendEmail).toHaveBeenCalledTimes(EMAIL_VERIFICATION.RATE_LIMIT_MAX)

    const res = await requestEmailCode(email, {client, sendEmail, rateLimiter})
    expect(res.success).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(EMAIL_VERIFICATION.RATE_LIMIT_MAX)
  })
})

describe('verifyEmailCode', () => {
  const email = 'user@example.com'
  const code = '123456'

  async function makeDoc(
    overrides: Partial<VerificationCodeDoc> = {}
  ): Promise<VerificationCodeDoc> {
    return {
      _id: `vcode::${email}`,
      _rev: '1-a',
      type: 'verification_code',
      email,
      codeHash: await sha256Hex(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      ...overrides
    }
  }

  test('returns success and userId on valid code, creating user', async () => {
    const doc = await makeDoc()
    const client = makeClient({
      findDoc: findDocMock(doc),
      findByMango: findByMangoMock([]),
      insertDoc: mock(async () => ({ok: true, id: 'new-id', rev: '1-a'}))
    })
    const res = await verifyEmailCode(email, code, {client})
    expect(res.success).toBe(true)
    expect(typeof res.userId).toBe('string')
    expect(client.deleteDoc).toHaveBeenCalledTimes(1)
    expect(client.insertDoc).toHaveBeenCalledTimes(1)
  })

  test('returns existing userId and marks verified when user already exists', async () => {
    const doc = await makeDoc()
    const existingUser = {
      _id: 'existing-uuid',
      _rev: '1-u',
      type: 'user' as const,
      email,
      verified: false,
      createdAt: new Date().toISOString()
    }
    const client = makeClient({
      findDoc: findDocMock(doc),
      findByMango: findByMangoMock([existingUser])
    })
    const res = await verifyEmailCode(email, code, {client})
    expect(res.success).toBe(true)
    expect(res.userId).toBe('existing-uuid')
    expect(client.insertDoc).not.toHaveBeenCalled()
    expect(client.updateDoc).toHaveBeenCalled()
  })

  test('expired code: deletes doc and errors', async () => {
    const doc = await makeDoc({
      expiresAt: new Date(Date.now() - 1000).toISOString()
    })
    const client = makeClient({findDoc: findDocMock(doc)})
    const res = await verifyEmailCode(email, code, {client})
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.CODE_EXPIRED)
    expect(client.deleteDoc).toHaveBeenCalledTimes(1)
  })

  test('wrong code increments attempts and errors', async () => {
    const doc = await makeDoc()
    const updateDoc = mock(async () => ({ok: true, id: doc._id, rev: '2-a'}))
    const client = makeClient({
      findDoc: findDocMock(doc),
      updateDoc
    })
    const res = await verifyEmailCode(email, 'wrong!', {client})
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.INVALID_CODE)
    expect(updateDoc).toHaveBeenCalledTimes(1)
    const call = updateDoc.mock.calls[0] as unknown as [string, VerificationCodeDoc]
    expect(call[1].attempts).toBe(1)
  })

  test('max attempts: deletes doc and errors', async () => {
    const doc = await makeDoc({attempts: EMAIL_VERIFICATION.MAX_ATTEMPTS})
    const client = makeClient({findDoc: findDocMock(doc)})
    const res = await verifyEmailCode(email, code, {client})
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.TOO_MANY_ATTEMPTS)
    expect(client.deleteDoc).toHaveBeenCalledTimes(1)
  })

  test('no code doc: errors without changing state', async () => {
    const client = makeClient({findDoc: findDocMock(null)})
    const res = await verifyEmailCode(email, code, {client})
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.INVALID_CODE)
    expect(client.deleteDoc).not.toHaveBeenCalled()
  })
})
