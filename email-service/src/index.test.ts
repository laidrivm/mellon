import {afterAll, beforeAll, describe, expect, mock, test} from 'bun:test'

const sendMock = mock(async () => ({ok: true as const}))

mock.module('./sender.ts', () => ({
  sendVerificationEmail: (email: string, code: string) => sendMock(email, code)
}))

const {handle} = await import('./index.ts')

const originalFetch = globalThis.fetch

beforeAll(() => {
  sendMock.mockClear()
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

function post(body: unknown, init: RequestInit = {}): Request {
  return new Request('http://localhost/', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init
  })
}

describe('email service HTTP', () => {
  test('sends email on valid payload', async () => {
    sendMock.mockClear()
    const res = await handle(post({email: 'user@example.com', code: '123456'}))

    expect(res.status).toBe(204)
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0]).toEqual(['user@example.com', '123456'])
  })

  test('rejects missing email', async () => {
    sendMock.mockClear()
    const res = await handle(post({code: '123456'}))

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects missing code', async () => {
    sendMock.mockClear()
    const res = await handle(post({email: 'user@example.com'}))

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects blank fields', async () => {
    sendMock.mockClear()
    const res = await handle(post({email: '   ', code: '   '}))

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects non-POST', async () => {
    sendMock.mockClear()
    const res = await handle(new Request('http://localhost/'))

    expect(res.status).toBe(405)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects unknown path', async () => {
    const res = await handle(
      new Request('http://localhost/other', {method: 'POST'})
    )
    expect(res.status).toBe(404)
  })

  test('returns 500 when sender fails', async () => {
    sendMock.mockClear()
    sendMock.mockImplementationOnce(async () => ({
      ok: false as const,
      error: 'boom'
    }))

    const res = await handle(post({email: 'user@example.com', code: '123456'}))

    expect(res.status).toBe(500)
    const body = (await res.json()) as {error: string}
    expect(body.error).toBe('boom')
  })
})
