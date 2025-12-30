import React, {type JSX} from 'react'
import type {UnlockFormProps} from '../../types.ts'
import {getMasterPasswordHint} from '../services/users.ts'
import Button from './Button.tsx'
import InputNewPassword from './InputNewPassword.tsx'

export default function UnlockForm({
  tryUnlock,
  handleSetShowForm,
  formError
}: UnlockFormProps): JSX.Element {
  const [password, setPassword] = React.useState('')
  const [passwordError, setPasswordError] = React.useState(false)
  const [hint, setHint] = React.useState<string | null>(null)
  const [hintError, setHintError] = React.useState<string | null>(null)

  async function verifyPassword(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setPasswordError(false)
    if (!password) {
      setPasswordError(true)
      return
    }
    await tryUnlock(password)
    setPassword('')
  }

  async function handleHint(event: React.MouseEvent): Promise<void> {
    event.preventDefault()

    if (hint || hintError) {
      setHint(null)
      setHintError(null)
      return
    }

    const response = await getMasterPasswordHint()
    if (response.success && response.data) {
      setHint(response.data.hint)
    } else {
      setHintError('Failed to load the hint')
    }
  }

  async function handleRecover(event: React.MouseEvent): Promise<void> {
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
          <Button type='button' style='secondary' onClick={handleHint}>
            Hint
          </Button>
          <Button type='button' style='secondary' onClick={handleRecover}>
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
