import type {JSX} from 'react'
import {useCopyToClipboard} from '../hooks/useCopyToClipboard.ts'

export default function ButtonCopyPassword({
  password
}: {
  password: string
}): JSX.Element {
  const {copied, copy} = useCopyToClipboard()

  return (
    <button
      type='button'
      onClick={() => copy(password)}
      disabled={copied}
      className={`transition-all duration-300 ${
        copied
          ? 'cursor-not-allowed opacity-75'
          : 'cursor-pointer hover:underline'
      }`}
    >
      {copied ? 'Done' : 'Copy'}
    </button>
  )
}
