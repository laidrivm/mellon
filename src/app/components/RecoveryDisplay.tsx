import React, {type JSX} from 'react'
import type {RecoveryDisplayProps} from '../../types.ts'
import {getRecoveryShares} from '../services/users.ts'
import Button from './Button.tsx'

export default function RecoveryDisplay({
  onContinue
}: RecoveryDisplayProps): JSX.Element {
  const [copied, setCopied] = React.useState<boolean>(false)
  const [recoveryShares, setRecoveryShares] = React.useState<string[]>([])

  React.useEffect(() => {
    async function loadInitialData() {
      const response = await getRecoveryShares()
      if (response.success && response.data) {
        setRecoveryShares(response.data)
      }
    }

    loadInitialData()
  }, [])

  const handleCopyAllWords = async () => {
    try {
      const allWords = recoveryShares.join('\n')
      await navigator.clipboard.writeText(allWords)
      setCopied(true)
      // Reset after 2 seconds
      setTimeout(() => {
        setCopied(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleContinue = () => {
    setRecoveryShares([])
    onContinue()
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h1 className='mb-2 text-2xl font-medium'>
          Backup Your Recovery Words
        </h1>
        <p>
          If you forget your master password, you can use these recovery words
          on the unlock screen to regain access to your secrets vault. Make sure
          to write them down exactly as shown, including the order and spelling.
        </p>
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-medium'>Recovery Words</h2>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={handleCopyAllWords}
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
          </div>
        </div>

        <ol style={{listStyleType: 'decimal'}}>
          {recoveryShares.map((share) => {
            return <li key={share}>{share}</li>
          })}
        </ol>
      </div>

      <div>
        <h2 className='text-lg font-medium'>Storage Best Practicies</h2>
        <ul className="mt-2 ml-1 list-inside list-['—_'] space-y-1">
          <li>Store these words in a secure, offline location</li>
          <li>Never share them with anyone</li>
          <li>Anyone with these words can access your passwords</li>
          <li>Write them down on paper, don&apos;t store digitally</li>
        </ul>
      </div>

      <div className='flex justify-center pt-4'>
        <Button type='button' onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  )
}
