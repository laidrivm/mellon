import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test'
import {requestEmailCode, verifyEmailCode} from './auth.ts'

const originalFetch = globalThis.fetch
const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit) => new Response()
)

function mockFetch(status: number, body: unknown): void {
  fetchMock.mockImplementationOnce(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: {'Content-Type': 'application/json'}
      })
  )
}

beforeEach(() => {
  fetchMock.mockClear()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('requestEmailCode', () => {
  test('posts to /api/auth/email/request and returns success', async () => {
    mockFetch(200, {success: true})
    const res = await requestEmailCode('user@example.com')
    expect(res.success).toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('/api/auth/email/request')
    expect(call[1]?.method).toBe('POST')
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      email: 'user@example.com'
    })
  })

  test('surfaces backend error message', async () => {
    mockFetch(400, {success: false, error: 'Invalid email address'})
    const res = await requestEmailCode('nope')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid email address')
  })

  test('maps network failure to error response', async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error('network down')
    })
    const res = await requestEmailCode('user@example.com')
    expect(res.success).toBe(false)
    expect(res.error).toBe('network down')
  })
})

describe('verifyEmailCode', () => {
  test('returns userId on success', async () => {
    mockFetch(200, {success: true, userId: 'uuid-123'})
    const res = await verifyEmailCode('user@example.com', '123456')
    expect(res.success).toBe(true)
    expect(res.data?.userId).toBe('uuid-123')

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toBe('/api/auth/email/verify')
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      email: 'user@example.com',
      code: '123456'
    })
  })

  test('surfaces backend error', async () => {
    mockFetch(400, {success: false, error: 'Invalid or expired code'})
    const res = await verifyEmailCode('user@example.com', '000000')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Invalid or expired code')
  })

  test('forwards userId in the request body when supplied', async () => {
    mockFetch(200, {success: true, userId: 'uuid-existing'})
    await verifyEmailCode('user@example.com', '123456', 'uuid-existing')

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      email: 'user@example.com',
      code: '123456',
      userId: 'uuid-existing'
    })
  })

  test('omits userId from body when not supplied', async () => {
    mockFetch(200, {success: true, userId: 'uuid-any'})
    await verifyEmailCode('user@example.com', '123456')

    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      email: 'user@example.com',
      code: '123456'
    })
  })

  test('fails when response lacks userId', async () => {
    mockFetch(200, {success: true})
    const res = await verifyEmailCode('user@example.com', '123456')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Missing userId in response')
  })
})
