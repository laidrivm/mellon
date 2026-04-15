import {render} from '@react-email/render'
import {createElement} from 'react'
import {Resend} from 'resend'
import VerificationCode from './templates/VerificationCode.tsx'

export type SendResult = {ok: true} | {ok: false; error: string}

interface SendPayload {
  from: string
  to: string
  subject: string
  html: string
}

type SendFn = (
  payload: SendPayload
) => Promise<{error?: {message: string} | null}>

export interface SenderDeps {
  send?: SendFn
}

function defaultSend(apiKey: string): SendFn {
  const client = new Resend(apiKey)
  return (payload) => client.emails.send(payload)
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  deps: SenderDeps = {}
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY ?? ''
  const fromEmail = process.env.FROM_EMAIL ?? ''

  if (!apiKey || !fromEmail) {
    return {ok: false, error: 'Email service is not configured'}
  }

  try {
    const html = await render(createElement(VerificationCode, {code}))
    const send = deps.send ?? defaultSend(apiKey)

    const {error} = await send({
      from: fromEmail,
      to: email,
      subject: 'Mellon Email Verification',
      html
    })

    if (error) return {ok: false, error: error.message}
    return {ok: true}
  } catch (err) {
    return {ok: false, error: err instanceof Error ? err.message : String(err)}
  }
}
