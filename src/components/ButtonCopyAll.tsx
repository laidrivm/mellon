import React, {type JSX} from 'react'
import type {Secret} from '../types.ts'

export default function ButtonCopyAll({secret}: {secret: Secret}): JSX.Element {
  const [copied, setCopied] = React.useState(false)

  const handleCopyAll = async () => {
    if (copied) return

    // Build the text to copy with non-empty values
    const textParts: string[] = []

    if (secret.name?.trim()) textParts.push(`Name: ${secret.name}`)
    if (secret.username?.trim()) textParts.push(`Username: ${secret.username}`)
    if (secret.password?.trim()) textParts.push(`Password: ${secret.password}`)
    if (secret.notes?.trim()) textParts.push(`Notes: ${secret.notes}`)

    const textToCopy = textParts.join('\n')

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)

      // Reset after 1 second
      setTimeout(() => {
        setCopied(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to copy all data:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)

      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 1000)
    }
  }

  return (
    <button
      type='button'
      onClick={handleCopyAll}
      disabled={copied}
      className={`transition-all duration-300 ${
        copied
          ? 'cursor-not-allowed opacity-75'
          : 'cursor-pointer hover:underline'
      }`}
    >
      <span
        className={`transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-100'}`}
      >
        {copied ? 'Copied' : 'Copy All'}
      </span>
    </button>
  )
}
