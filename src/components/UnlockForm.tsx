import React, {ReactNode} from 'react'

import InputNewPassword from './InputNewPassword.tsx'
import Button from './Button.tsx'

import type {MasterPassword} from '../types.ts'

export default function UnlockMellon({
  masterPassword,
  setLocked
}: {
  masterPassword: MasterPassword
  setLocked: (locked: boolean) => void
}): ReactNode {
  const [password, setPassword] = React.useState('')

  function verifyPassword(event): void {
    event.preventDefault()
    if (password === masterPassword.password) {
      setLocked(false)
    }
    setPassword('')
  }

  function showHint(event): void {
    event.preventDefault()
    console.log(`Hint: ${masterPassword.hint}`)
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
        />
        <div className='mt-6 flex items-center justify-center gap-6'>
          <Button style='secondary' onClick={showHint}>
            Hint
          </Button>
          <Button style='secondary'>Recover</Button>
          <Button>Unlock</Button>
        </div>
      </form>
    </div>
  )
}
