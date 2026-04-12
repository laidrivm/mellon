import React from 'react'

// Writes `text` to the clipboard, falling back to a transient textarea for
// older browsers/contexts where the async clipboard API is unavailable.
async function writeToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.error('Failed to copy:', error)
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

export function useCopyToClipboard(resetMs = 1000): {
  copied: boolean
  copy: (text: string) => Promise<void>
} {
  const [copied, setCopied] = React.useState(false)

  const copy = React.useCallback(
    async (text: string) => {
      if (copied) return
      await writeToClipboard(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), resetMs)
    },
    [copied, resetMs]
  )

  return {copied, copy}
}
