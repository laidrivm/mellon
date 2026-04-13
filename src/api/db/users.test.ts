import {describe, expect, mock, test} from 'bun:test'
import type {CouchClient} from '../couch-client.ts'
import {codeDocId, getUserDbName, initUsersDb, markUserVerified} from './users.ts'

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
