import {describe, expect, mock, test} from 'bun:test'
import {EMAIL_VERIFICATION, ERROR_MESSAGES} from './config.ts'
import type {CouchClient} from './couch-client.ts'
import type {VerificationCodeDoc} from './db/users.ts'
import {
  createCouchRateLimitStore,
  createMemoryRateLimitStore,
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

describe('requestEmailCode', () => {
  test('rejects invalid email format', async () => {
    const client = makeClient()
    const sendEmail = mock(async () => true)
    const rateLimitStore = createMemoryRateLimitStore()
    const res = await requestEmailCode('not-an-email', {
      client,
      sendEmail,
      rateLimitStore
    })
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.INVALID_EMAIL)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('generates code, saves doc, calls email service on happy path', async () => {
    const client = makeClient()
    const sendEmail = mock(async () => true)
    const rateLimitStore = createMemoryRateLimitStore()
    const res = await requestEmailCode('user@example.com', {
      client,
      sendEmail,
      rateLimitStore
    })
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
    const rateLimitStore = createMemoryRateLimitStore()
    const res = await requestEmailCode('user@example.com', {
      client,
      sendEmail,
      rateLimitStore
    })
    expect(res.success).toBe(false)
    expect(res.error).toBe(ERROR_MESSAGES.EMAIL_SEND_FAILED)
  })

  test('silently drops 4th request within rate-limit window', async () => {
    const client = makeClient()
    const sendEmail = mock(async () => true)
    const rateLimitStore = createMemoryRateLimitStore()
    const email = 'user@example.com'
    for (let i = 0; i < EMAIL_VERIFICATION.RATE_LIMIT_MAX; i++) {
      await requestEmailCode(email, {client, sendEmail, rateLimitStore})
    }
    expect(sendEmail).toHaveBeenCalledTimes(EMAIL_VERIFICATION.RATE_LIMIT_MAX)

    const res = await requestEmailCode(email, {
      client,
      sendEmail,
      rateLimitStore
    })
    expect(res.success).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(EMAIL_VERIFICATION.RATE_LIMIT_MAX)
  })
})

describe('createMemoryRateLimitStore', () => {
  test('returns empty array for unknown email', async () => {
    const store = createMemoryRateLimitStore()
    expect(await store.load('nobody@example.com')).toEqual([])
  })

  test('round-trips hits per email', async () => {
    const store = createMemoryRateLimitStore()
    await store.save('a@x.com', [1, 2, 3])
    await store.save('b@x.com', [9])
    expect(await store.load('a@x.com')).toEqual([1, 2, 3])
    expect(await store.load('b@x.com')).toEqual([9])
  })
})

describe('createCouchRateLimitStore', () => {
  function makeClient(overrides: Partial<CouchClient> = {}): CouchClient {
    return {
      createDb: mock(async () => undefined),
      ensureDb: mock(async () => undefined),
      ensureIndex: mock(async () => undefined),
      insertDoc: mock(async () => ({ok: true, id: 'id', rev: '1-a'})),
      updateDoc: mock(async () => ({ok: true, id: 'id', rev: '1-a'})),
      findDoc: mock(async () => null) as unknown as CouchClient['findDoc'],
      findByMango: mock(
        async () => []
      ) as unknown as CouchClient['findByMango'],
      deleteDoc: mock(async () => undefined),
      putSecurity: mock(async () => true),
      ...overrides
    }
  }

  test('load returns empty array when no doc exists', async () => {
    const store = createCouchRateLimitStore(makeClient())
    expect(await store.load('user@example.com')).toEqual([])
  })

  test('load returns hits from existing doc', async () => {
    const client = makeClient({
      findDoc: mock(async () => ({
        _id: 'rl::user@example.com',
        _rev: '1-a',
        type: 'rate_limit',
        hits: [10, 20]
      })) as unknown as CouchClient['findDoc']
    })
    const store = createCouchRateLimitStore(client)
    expect(await store.load('user@example.com')).toEqual([10, 20])
  })

  test('save swallows 409 conflict and does not throw', async () => {
    const conflict = Object.assign(new Error('conflict'), {statusCode: 409})
    const updateDoc = mock(async () => {
      throw conflict
    }) as unknown as CouchClient['updateDoc']
    const client = makeClient({updateDoc})

    const store = createCouchRateLimitStore(client)
    await expect(
      store.save('user@example.com', [1, 2])
    ).resolves.toBeUndefined()
  })

  test('save rethrows non-conflict errors', async () => {
    const boom = Object.assign(new Error('boom'), {statusCode: 500})
    const updateDoc = mock(async () => {
      throw boom
    }) as unknown as CouchClient['updateDoc']
    const client = makeClient({updateDoc})

    const store = createCouchRateLimitStore(client)
    await expect(store.save('user@example.com', [1])).rejects.toThrow('boom')
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

  test('reuses supplied userId without creating a new userdb', async () => {
    const doc = await makeDoc()
    const client = makeClient({
      findDoc: findDocMock(doc)
    })
    const res = await verifyEmailCode(email, code, {client, userId: 'my-uuid'})
    expect(res.success).toBe(true)
    expect(res.userId).toBe('my-uuid')
    expect(client.createDb).not.toHaveBeenCalled()
    expect(client.putSecurity).not.toHaveBeenCalled()
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
    const call = updateDoc.mock.calls[0] as unknown as [
      string,
      VerificationCodeDoc
    ]
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
