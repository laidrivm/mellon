import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test'
import {ApiError, ErrorCategory, ErrorCode} from './errors.ts'
import {withApiError} from './with-api-error.ts'

describe('withApiError', () => {
  const originalError = console.error
  beforeEach(() => {
    console.error = mock(() => {})
  })
  afterEach(() => {
    console.error = originalError
  })

  const buildError = (cause: Error) =>
    new ApiError(
      'wrapped',
      ErrorCode.UNKNOWN_ERROR,
      ErrorCategory.VALIDATION,
      cause
    )

  test('passes through the return value on success', async () => {
    const result = await withApiError(buildError, async () => 42)
    expect(result).toBe(42)
  })

  test('does not invoke the error builder on success', async () => {
    const spy = mock(buildError)
    await withApiError(spy, async () => 'ok')
    expect(spy).not.toHaveBeenCalled()
  })

  test('wraps caught Error into the built ApiError', async () => {
    const cause = new Error('boom')
    const promise = withApiError(buildError, async () => {
      throw cause
    })
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({message: 'wrapped', cause})
  })

  test('normalizes non-Error throws into Error causes', async () => {
    let caught: ApiError | null = null
    try {
      await withApiError(buildError, async () => {
        throw 'string failure'
      })
    } catch (error) {
      caught = error as ApiError
    }
    expect(caught).toBeInstanceOf(ApiError)
    expect(caught?.cause).toBeInstanceOf(Error)
    expect(caught?.cause?.message).toBe('string failure')
  })
})
