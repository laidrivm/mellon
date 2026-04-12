import type {JSX} from 'react'
import type {Secret} from '../../types.ts'
import {useCopyToClipboard} from '../hooks/useCopyToClipboard.ts'

function formatSecret(secret: Secret): string {
  const parts: string[] = []
  if (secret.name?.trim()) parts.push(`Name: ${secret.name}`)
  if (secret.username?.trim()) parts.push(`Username: ${secret.username}`)
  if (secret.password?.trim()) parts.push(`Password: ${secret.password}`)
  if (secret.notes?.trim()) parts.push(`Notes: ${secret.notes}`)
  return parts.join('\n')
}

export default function ButtonCopyAll({secret}: {secret: Secret}): JSX.Element {
  const {copied, copy} = useCopyToClipboard()

  return (
    <button
      type='button'
      onClick={() => copy(formatSecret(secret))}
      disabled={copied}
      className={`transition-all duration-300 ${
        copied
          ? 'cursor-not-allowed opacity-75'
          : 'cursor-pointer hover:underline'
      }`}
    >
      {copied ? 'Copied' : 'Copy All'}
    </button>
  )
}
