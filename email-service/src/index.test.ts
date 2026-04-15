import {beforeEach, describe, expect, mock, test} from 'bun:test'
import {handle} from './index.ts'
import type {SendResult} from './sender.ts'

const sendMock = mock(
  async (_email: string, _code: string): Promise<SendResult> => ({ok: true})
)

beforeEach(() => {
  sendMock.mockReset()
  sendMock.mockImplementation(async () => ({ok: true}))
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
    const res = await handle(
      post({email: 'user@example.com', code: '123456'}),
      {send: sendMock}
    )

    expect(res.status).toBe(204)
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0]).toEqual(['user@example.com', '123456'])
  })

  test('rejects missing email', async () => {
    const res = await handle(post({code: '123456'}), {send: sendMock})

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects missing code', async () => {
    const res = await handle(post({email: 'user@example.com'}), {
      send: sendMock
    })

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects blank fields', async () => {
    const res = await handle(post({email: '   ', code: '   '}), {
      send: sendMock
    })

    expect(res.status).toBe(400)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects non-POST', async () => {
    const res = await handle(new Request('http://localhost/'), {
      send: sendMock
    })

    expect(res.status).toBe(405)
    expect(sendMock).not.toHaveBeenCalled()
  })

  test('rejects unknown path', async () => {
    const res = await handle(
      new Request('http://localhost/other', {method: 'POST'}),
      {send: sendMock}
    )
    expect(res.status).toBe(404)
  })

  test('returns 500 when sender fails', async () => {
    sendMock.mockImplementationOnce(async () => ({ok: false, error: 'boom'}))

    const res = await handle(
      post({email: 'user@example.com', code: '123456'}),
      {send: sendMock}
    )

    expect(res.status).toBe(500)
    const body = (await res.json()) as {error: string}
    expect(body.error).toBe('boom')
  })
})
