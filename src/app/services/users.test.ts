import {describe, expect, mock, test} from 'bun:test'
import type {LocalUserDoc} from '../../types.ts'

// pouchdb-browser cannot initialise in Bun's test env (no IndexedDB), so stub
// the module that instantiates it. The tests below exercise a pure function
// that never touches the DB.
mock.module('./pouchDB.ts', () => ({
  localSecretsDB: {},
  localUserDB: {}
}))

const {withEmailVerified} = await import('./users.ts')

describe('withEmailVerified', () => {
  const now = '2026-04-15T10:00:00.000Z'

  test('stamps verifiedUserId, verifiedAt and updatedAt', () => {
    const doc: LocalUserDoc = {_id: 'local-user', onboarding: 'code'}
    const result = withEmailVerified(doc, 'server-uuid', now)

    expect(result.verifiedUserId).toBe('server-uuid')
    expect(result.verifiedAt).toBe(now)
    expect(result.updatedAt).toBe(now)
  })

  test('preserves unrelated fields', () => {
    const doc: LocalUserDoc = {
      _id: 'local-user',
      _rev: '3-abc',
      onboarding: 'code',
      email: 'user@example.com',
      hint: 'a hint',
      createdAt: '2026-04-10T00:00:00.000Z'
    }
    const result = withEmailVerified(doc, 'server-uuid', now)

    expect(result._rev).toBe('3-abc')
    expect(result.onboarding).toBe('code')
    expect(result.email).toBe('user@example.com')
    expect(result.hint).toBe('a hint')
    expect(result.createdAt).toBe('2026-04-10T00:00:00.000Z')
  })

  test('overwrites prior verification markers on re-verify', () => {
    const doc: LocalUserDoc = {
      _id: 'local-user',
      verifiedUserId: 'old-uuid',
      verifiedAt: '2026-01-01T00:00:00.000Z'
    }
    const result = withEmailVerified(doc, 'new-uuid', now)

    expect(result.verifiedUserId).toBe('new-uuid')
    expect(result.verifiedAt).toBe(now)
  })
})
