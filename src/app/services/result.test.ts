import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test'
import {wrap} from './result.ts'

describe('wrap', () => {
  const originalError = console.error
  let errorSpy: ReturnType<typeof mock>

  beforeEach(() => {
    errorSpy = mock(() => {})
    console.error = errorSpy
  })

  afterEach(() => {
    console.error = originalError
  })

  test('returns {success: true, data} when fn resolves', async () => {
    const result = await wrap('doing a thing', async () => 42)
    expect(result).toEqual({success: true, data: 42})
    expect(errorSpy).not.toHaveBeenCalled()
  })

  test('extracts message from thrown Error', async () => {
    const result = await wrap('doing a thing', async () => {
      throw new Error('boom')
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })

  test('stringifies non-Error throws', async () => {
    const result = await wrap('doing a thing', async () => {
      throw 'plain string'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('plain string')
  })

  test('logs with label on failure', async () => {
    await wrap('creating widget', async () => {
      throw new Error('nope')
    })
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect((errorSpy.mock.calls[0] as unknown[])[0]).toBe(
      'Error creating widget:'
    )
  })
})
