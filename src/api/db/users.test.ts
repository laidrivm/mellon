import {describe, expect, mock, test} from 'bun:test'
import type {CouchClient} from '../couch-client.ts'
import {
  codeDocId,
  getUserDbName,
  initUsersDb,
  markUserVerified,
  sweepExpiredVerificationCodes,
  type UserDoc,
  type VerificationCodeDoc
} from './users.ts'

function findByMangoMock<T>(values: T[]) {
  return mock(async () => values) as unknown as CouchClient['findByMango']
}

function findDocMock<T>(value: T | null) {
  return mock(async () => value) as unknown as CouchClient['findDoc']
}

function makeClient(overrides: Partial<CouchClient> = {}): CouchClient {
  return {
    createDb: mock(async () => undefined),
    ensureDb: mock(async () => undefined),
    ensureIndex: mock(async () => undefined),
    insertDoc: mock(async () => ({ok: true, id: 'id', rev: '1-a'})),
    updateDoc: mock(async () => ({ok: true, id: 'id', rev: '1-a'})),
    findDoc: mock(async () => null) as unknown as CouchClient['findDoc'],
    findByMango: mock(async () => []) as unknown as CouchClient['findByMango'],
    deleteDoc: mock(async () => undefined),
    putSecurity: mock(async () => true),
    ...overrides
  }
}

describe('codeDocId', () => {
  test('produces namespaced id', () => {
    expect(codeDocId('user@example.com')).toBe('vcode::user@example.com')
  })
})

describe('markUserVerified', () => {
  test('creates userdb for a new user', async () => {
    const client = makeClient()
    const id = await markUserVerified('new@example.com', {client})

    expect(client.insertDoc).toHaveBeenCalledTimes(1)
    expect(client.createDb).toHaveBeenCalledTimes(1)
    const createCall = (client.createDb as ReturnType<typeof mock>).mock
      .calls[0]
    expect(createCall?.[0]).toBe(getUserDbName(id))
    expect(client.putSecurity).toHaveBeenCalledTimes(1)
  })

  test('attaches email to an existing anonymous user when userId is passed', async () => {
    const existingAnon: UserDoc = {
      _id: 'anon-uuid',
      _rev: '1-a',
      type: 'user',
      email: '',
      verified: false,
      createdAt: new Date().toISOString()
    }
    const client = makeClient({findDoc: findDocMock(existingAnon)})

    const id = await markUserVerified('new@example.com', {
      client,
      userId: 'anon-uuid'
    })

    expect(id).toBe('anon-uuid')
    expect(client.updateDoc).toHaveBeenCalledTimes(1)
    expect(client.insertDoc).not.toHaveBeenCalled()
    expect(client.createDb).not.toHaveBeenCalled()
    expect(client.putSecurity).not.toHaveBeenCalled()
    const updateCall = (client.updateDoc as ReturnType<typeof mock>).mock
      .calls[0]
    const written = updateCall?.[1] as UserDoc
    expect(written._id).toBe('anon-uuid')
    expect(written.email).toBe('new@example.com')
    expect(written.verified).toBe(true)
  })

  test('inserts UserDoc keyed by userId when no anonymous doc exists yet', async () => {
    const client = makeClient({findDoc: findDocMock(null)})

    const id = await markUserVerified('new@example.com', {
      client,
      userId: 'anon-uuid'
    })

    expect(id).toBe('anon-uuid')
    expect(client.updateDoc).toHaveBeenCalledTimes(1)
    expect(client.createDb).not.toHaveBeenCalled()
    expect(client.putSecurity).not.toHaveBeenCalled()
  })

  test('does not create userdb for an existing user', async () => {
    const existing = {
      _id: 'existing-uuid',
      _rev: '1-u',
      type: 'user' as const,
      email: 'old@example.com',
      verified: false,
      createdAt: new Date().toISOString()
    }
    const client = makeClient({findByMango: findByMangoMock([existing])})

    const id = await markUserVerified('old@example.com', {client})

    expect(id).toBe('existing-uuid')
    expect(client.insertDoc).not.toHaveBeenCalled()
    expect(client.createDb).not.toHaveBeenCalled()
    expect(client.updateDoc).toHaveBeenCalledTimes(1)
  })
})

describe('sweepExpiredVerificationCodes', () => {
  function makeCodeDoc(
    id: string,
    expiresAt: string,
    rev: string | null = '1-a'
  ): VerificationCodeDoc {
    return {
      _id: id,
      ...(rev === null ? {} : {_rev: rev}),
      type: 'verification_code',
      email: id.replace('vcode::', ''),
      codeHash: 'hash',
      attempts: 0,
      expiresAt,
      createdAt: '2026-04-15T09:00:00.000Z'
    }
  }

  test('deletes all expired docs and returns the count', async () => {
    const now = Date.parse('2026-04-15T10:00:00.000Z')
    const expired = [
      makeCodeDoc('vcode::a@x.com', '2026-04-15T09:50:00.000Z'),
      makeCodeDoc('vcode::b@x.com', '2026-04-15T09:55:00.000Z')
    ]
    const deleteDoc = mock(
      async (_db: string, _id: string, _rev: string) => undefined
    )
    const client = makeClient({
      findByMango: findByMangoMock(expired),
      deleteDoc
    })

    const count = await sweepExpiredVerificationCodes(now, {client})

    expect(count).toBe(2)
    expect(deleteDoc).toHaveBeenCalledTimes(2)
    expect(deleteDoc.mock.calls[0]).toEqual([
      'mellon-users',
      'vcode::a@x.com',
      '1-a'
    ])
    expect(deleteDoc.mock.calls[1]).toEqual([
      'mellon-users',
      'vcode::b@x.com',
      '1-a'
    ])
  })

  test('skips docs without a _rev', async () => {
    const now = Date.now()
    const docs = [
      makeCodeDoc('vcode::a@x.com', '2020-01-01T00:00:00.000Z', null),
      makeCodeDoc('vcode::b@x.com', '2020-01-01T00:00:00.000Z')
    ]
    const deleteDoc = mock(
      async (_db: string, _id: string, _rev: string) => undefined
    )
    const client = makeClient({
      findByMango: findByMangoMock(docs),
      deleteDoc
    })

    const count = await sweepExpiredVerificationCodes(now, {client})

    expect(count).toBe(1)
    expect(deleteDoc).toHaveBeenCalledTimes(1)
    expect(deleteDoc.mock.calls[0]?.[1]).toBe('vcode::b@x.com')
  })

  test('tolerates individual delete failures', async () => {
    const now = Date.now()
    const docs = [
      makeCodeDoc('vcode::a@x.com', '2020-01-01T00:00:00.000Z'),
      makeCodeDoc('vcode::b@x.com', '2020-01-01T00:00:00.000Z')
    ]
    const deleteDoc = mock(async (_db: string, id: string) => {
      if (id === 'vcode::a@x.com') throw new Error('conflict')
    })
    const client = makeClient({
      findByMango: findByMangoMock(docs),
      deleteDoc
    })

    const count = await sweepExpiredVerificationCodes(now, {client})

    expect(count).toBe(1)
    expect(deleteDoc).toHaveBeenCalledTimes(2)
  })
})

describe('initUsersDb', () => {
  test('ensures db and two required indexes', async () => {
    const client = makeClient()
    await initUsersDb({client})

    expect(client.ensureDb).toHaveBeenCalledTimes(1)
    const dbArg = (client.ensureDb as ReturnType<typeof mock>).mock.calls[0]
    expect(dbArg?.[0]).toBe('mellon-users')

    expect(client.ensureIndex).toHaveBeenCalledTimes(2)
    const indexCalls = (
      client.ensureIndex as ReturnType<typeof mock>
    ).mock.calls.map((c) => c[1] as {name: string; index: {fields: string[]}})
    expect(indexCalls.map((i) => i.name).sort()).toEqual([
      'email-index',
      'type-expires-index'
    ])
    const byName = Object.fromEntries(indexCalls.map((i) => [i.name, i]))
    expect(byName['email-index']?.index.fields).toEqual(['email'])
    expect(byName['type-expires-index']?.index.fields).toEqual([
      'type',
      'expiresAt'
    ])
  })
})
