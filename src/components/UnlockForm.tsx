import React from 'react'

import InputNewPassword from './InputNewPassword.tsx'
import Button from './Button.tsx'
import {getMasterPasswordHint} from '../services/users.ts'

import type {UnlockFormProps} from '../types.ts'

export default function UnlockForm({
  tryUnlock,
  handleSetShowForm,
  formError
}: UnlockFormProps): JSX.Element {
  const [password, setPassword] = React.useState('')
  const [passwordError, setPasswordError] = React.useState(false)
  const [hint, setHint] = React.useState(null)
  const [hintError, setHintError] = React.useState(null)

  async function verifyPassword(event): void {
    event.preventDefault()
    setPasswordError(false)
    if (!password) {
      setPasswordError(true)
      return
    }
    await tryUnlock(password)
    setPassword('')
  }

  async function handleHint(event): void {
    event.preventDefault()

    if (hint || hintError) {
      setHint(null)
      setHintError(null)
      return
    }

    const response = await getMasterPasswordHint()
    if (response.success) {
      setHint(response.data.hint)
    } else {
      setHintError('Failed to load the hint')
    }
  }

  async function handleRecover(event): void {
    event.preventDefault()

    handleSetShowForm('recovery')
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>Speak Friend and Enter</h1>
      <p className='text-md leading-6'>
        Unlock secrets with your master password.
      </p>

      <form className='space-y-4' onSubmit={verifyPassword}>
        <InputNewPassword
          password={password}
          setPassword={setPassword}
          isGenerationAvailable={false}
          error={passwordError}
        />
        <div className='mt-6 flex items-center justify-center gap-6'>
          <Button style='secondary' onClick={handleHint}>
            Hint
          </Button>
          <Button style='secondary' onClick={handleRecover}>
            Recover
          </Button>
          <Button>Unlock</Button>
        </div>
      </form>
      {formError && <div className='text-md text-red-500'>{formError}</div>}
      {hint && <div className='text-md'>{`Hint: ${hint}`}</div>}
      {hintError && <div className='text-md text-red-500'>{hintError}</div>}
    </div>
  )
}
