import React, {type JSX} from 'react'

export default function ButtonCopyPassword({
  password
}: {
  password: string
}): JSX.Element {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    if (copied) return

    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)

      // Reset after 1 second
      setTimeout(() => {
        setCopied(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to copy password:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = password
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
      onClick={handleCopy}
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
        {copied ? 'Done' : 'Copy'}
      </span>
    </button>
  )
}
