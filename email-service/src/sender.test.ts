import {afterEach, beforeEach, describe, expect, mock, test} from 'bun:test'
import {sendVerificationEmail} from './sender.ts'

const envKeys = ['RESEND_API_KEY', 'FROM_EMAIL'] as const

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(envKeys.map((k) => [k, process.env[k]]))
}

function restoreEnv(snap: Record<string, string | undefined>): void {
  for (const k of envKeys) {
    if (snap[k] === undefined) delete process.env[k]
    else process.env[k] = snap[k]
  }
}

describe('sendVerificationEmail', () => {
  let original: Record<string, string | undefined>

  beforeEach(() => {
    original = snapshotEnv()
    process.env.RESEND_API_KEY = 'test-key'
    process.env.FROM_EMAIL = 'from@example.com'
  })

  afterEach(() => {
    restoreEnv(original)
  })

  test('returns error when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY
    const send = mock(async () => ({error: null}))
    const res = await sendVerificationEmail('u@x.com', '123456', {send})
    expect(res).toEqual({ok: false, error: 'Email service is not configured'})
    expect(send).not.toHaveBeenCalled()
  })

  test('returns error when FROM_EMAIL is missing', async () => {
    delete process.env.FROM_EMAIL
    const send = mock(async () => ({error: null}))
    const res = await sendVerificationEmail('u@x.com', '123456', {send})
    expect(res).toEqual({ok: false, error: 'Email service is not configured'})
    expect(send).not.toHaveBeenCalled()
  })

  test('invokes send with rendered payload on happy path', async () => {
    interface Payload {
      from: string
      to: string
      subject: string
      html: string
    }
    const send = mock(
      async (
        _payload: Payload
      ): Promise<{error?: {message: string} | null}> => ({error: null})
    )
    const res = await sendVerificationEmail('user@example.com', '424242', {
      send
    })
    expect(res).toEqual({ok: true})
    expect(send).toHaveBeenCalledTimes(1)
    const payload = send.mock.calls[0]?.[0]
    expect(payload?.from).toBe('from@example.com')
    expect(payload?.to).toBe('user@example.com')
    expect(payload?.subject).toBe('Mellon Email Verification')
    expect(payload?.html).toContain('424242')
  })

  test('returns error when send reports a provider error', async () => {
    const send = mock(async () => ({error: {message: 'rate limited'}}))
    const res = await sendVerificationEmail('u@x.com', '123456', {send})
    expect(res).toEqual({ok: false, error: 'rate limited'})
  })

  test('returns error when send throws', async () => {
    const send = mock(async () => {
      throw new Error('network down')
    })
    const res = await sendVerificationEmail('u@x.com', '123456', {send})
    expect(res).toEqual({ok: false, error: 'network down'})
  })
})
