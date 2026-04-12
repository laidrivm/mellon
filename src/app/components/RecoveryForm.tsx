import React, {type JSX} from 'react'
import type {FormState} from '../../types.ts'
import Button from './Button.tsx'

interface RecoveryFormProps {
  onRecoveryAttempt: (shares: string[]) => void
  handleSetShowForm: (form: FormState | null) => void
  formError?: string | null
}

export default function RecoveryInput({
  onRecoveryAttempt,
  handleSetShowForm,
  formError
}: RecoveryFormProps): JSX.Element {
  const [recoveryText, setRecoveryText] = React.useState('')
  const [validationErrors, setValidationErrors] = React.useState<string[]>([])

  const EXPECTED_WORDS = 12

  const validateWord = (word: string): boolean => {
    // TODO: validate against the full BIP39 wordlist
    return word.length >= 3 && /^[a-zA-Z]+$/.test(word)
  }

  const handleTextModeSubmit = () => {
    const words = recoveryText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)

    if (words.length === 0) {
      setValidationErrors(['Please enter your recovery words'])
      return
    }

    const errors: string[] = []
    if (words.length !== EXPECTED_WORDS) {
      errors.push(`Expected ${EXPECTED_WORDS} words, got ${words.length}`)
    }
    words.forEach((word, index) => {
      if (!validateWord(word)) {
        errors.push(`Word ${index + 1} ("${word}") is not valid`)
      }
    })

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors([])
    onRecoveryAttempt(words)
  }

  /**
   * Cancel recovery input
   */
  const onCancel = React.useCallback(() => {
    handleSetShowForm(null)
    //setFormError(null)
  }, [handleSetShowForm])

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h1 className='mb-2 text-2xl font-medium'>Recover Your Password</h1>
        <p>
          Enter your 12 recovery words to regain access to your password vault.
          Mind the order. Separate words with spaces.
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
          placeholder='Enter your 12 recovery words separated by spaces...'
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
