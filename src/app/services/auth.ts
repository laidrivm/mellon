import type {ServiceResponse} from '../../types.ts'
import {wrap} from './result.ts'

interface AuthResponse {
  success: boolean
  error?: string
  userId?: string
}

async function postJson(path: string, body: unknown): Promise<AuthResponse> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  })
  const data = (await response.json().catch(() => ({}))) as AuthResponse
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? `Request failed: ${response.status}`)
  }
  return data
}

export function requestEmailCode(email: string): Promise<ServiceResponse> {
  return wrap('requesting email code', async () => {
    await postJson('/api/auth/email/request', {email})
    return undefined
  })
}

export function verifyEmailCode(
  email: string,
  code: string
): Promise<ServiceResponse<{userId: string}>> {
  return wrap('verifying email code', async () => {
    const data = await postJson('/api/auth/email/verify', {email, code})
    if (!data.userId) throw new Error('Missing userId in response')
    return {userId: data.userId}
  })
}
