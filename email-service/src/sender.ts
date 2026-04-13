import {render} from '@react-email/render'
import {createElement} from 'react'
import {Resend} from 'resend'
import VerificationCode from './templates/VerificationCode.tsx'

export type SendResult = {ok: true} | {ok: false; error: string}

const apiKey = process.env.RESEND_API_KEY ?? ''
const fromEmail = process.env.FROM_EMAIL ?? ''

const resend = new Resend(apiKey)

export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<SendResult> {
  if (!apiKey || !fromEmail) {
    return {ok: false, error: 'Email service is not configured'}
  }

  try {
    const html = await render(createElement(VerificationCode, {code}))

    const {error} = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Подтверждение почты',
      html
    })

    if (error) return {ok: false, error: error.message}
    return {ok: true}
  } catch (err) {
    return {ok: false, error: err instanceof Error ? err.message : String(err)}
  }
}
