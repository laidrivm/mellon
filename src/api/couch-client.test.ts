import {describe, expect, test} from 'bun:test'
import {isConflictError} from './couch-client.ts'

describe('isConflictError', () => {
  test('returns true for 409 status code', () => {
    expect(isConflictError({statusCode: 409})).toBe(true)
    expect(
      isConflictError(Object.assign(new Error('conflict'), {statusCode: 409}))
    ).toBe(true)
  })

  test('returns false for other status codes', () => {
    expect(isConflictError({statusCode: 404})).toBe(false)
    expect(isConflictError({statusCode: 500})).toBe(false)
  })

  test('returns false for plain errors without statusCode', () => {
    expect(isConflictError(new Error('conflict'))).toBe(false)
  })

  test('returns false for null/undefined/non-objects', () => {
    expect(isConflictError(null)).toBe(false)
    expect(isConflictError(undefined)).toBe(false)
    expect(isConflictError('conflict')).toBe(false)
    expect(isConflictError(409)).toBe(false)
  })
})
