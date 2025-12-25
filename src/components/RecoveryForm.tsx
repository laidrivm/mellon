import React from 'react'
import type {RecoveryFormProps} from '../types.ts'
import Button from './Button.tsx'

export default function RecoveryInput({
  onRecoveryAttempt,
  handleSetShowForm,
  formError
}: RecoveryFormProps): JSX.Element {
  const [recoveryText, setRecoveryText] = React.useState('')
  const [validationErrors, setValidationErrors] = React.useState<string[]>([])

  const validateWord = (word: string): boolean => {
    // TODO: validate against the full BIP39 wordlist
    return word.length >= 3 && /^[a-zA-Z]+$/.test(word)
  }

  const validateShare = (share: string): string[] => {
    const words = share
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)
    const errors: string[] = []

    if (words.length === 0) {
      errors.push('Share cannot be empty')
      return errors
    }

    if (words.length < 3) {
      errors.push('Share must contain at least 3 words')
    }

    words.forEach((word, index) => {
      if (!validateWord(word)) {
        errors.push(`Word ${index + 1} ("${word}") is not valid`)
      }
    })

    return errors
  }

  const handleTextModeSubmit = () => {
    const parsedShares = recoveryText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (parsedShares.length === 0) {
      setValidationErrors(['Please enter at least one recovery share'])
      return
    }

    const allErrors: string[] = []
    parsedShares.forEach((share, index) => {
      const shareErrors = validateShare(share)
      shareErrors.forEach((error) => {
        allErrors.push(`Share ${index + 1}: ${error}`)
      })
    })

    if (allErrors.length > 0) {
      setValidationErrors(allErrors)
      return
    }

    setValidationErrors([])
    onRecoveryAttempt(parsedShares)
  }

  /**
   * Cancel recovery input
   */
  const onCancel = React.useCallback(() => {
    handleSetShowForm('null')
    //setFormError(null)
  }, [handleSetShowForm])

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h1 className='mb-2 text-2xl font-medium'>Recover Your Password</h1>
        <p>
          Enter your recovery words to regain access to your password vault.
          Mind the order. Separate words with spaces. Separate shares with new
          lines.
        </p>
      </div>

      <div className='space-y-3'>
        <label htmlFor='recovery-words' className='block text-sm font-medium'>
          Recovery Words
        </label>
        <textarea
          id='recovery-words'
          value={recoveryText}
          onChange={(e) => setRecoveryText(e.target.value)}
          placeholder='Enter your recovery words here, one share per line...'
          className='h-32 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500'
          autoComplete='off'
          spellCheck={false}
        />
      </div>

      {validationErrors.length > 0 && (
        <div>
          <h4 className='mb-2 text-sm font-medium text-red-600'>
            Validation Errors:
          </h4>
          <ul className='space-y-1 text-sm text-red-600'>
            {validationErrors.map((error) => (
              <li key={error}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {formError && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
          <p className='text-sm text-red-700'>{formError}</p>
        </div>
      )}

      <div className='flex items-center justify-between space-x-4'>
        <Button type='button' style='secondary' onClick={onCancel}>
          Cancel
        </Button>

        <Button type='button' onClick={handleTextModeSubmit}>
          Recover Password
        </Button>
      </div>
    </div>
  )
}
