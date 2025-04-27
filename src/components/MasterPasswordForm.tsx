import React, {ReactNode} from 'react'

import InputNewPassword from './InputNewPassword.tsx'
import InputTextArea from './InputTextArea.tsx'
import Button from './Button.tsx'

import {MasterPassword} from '../types.ts'

export default function MasterPasswordForm({
  addMasterPassword
}: {
  addMasterPassword: (masterPassword: MasterPassword) => void
}): ReactNode {
  const [password, setPassword] = React.useState('')
  const [hint, setHint] = React.useState('')

  function handleMasterPassword(event): void {
    event.preventDefault()
    addMasterPassword({password, hint})
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>Set Master Password</h1>
      <p className='text-md leading-6'>
        Hide secrets on your device while you’re idle.
      </p>
      <form className='space-y-4' onSubmit={handleMasterPassword}>
        <InputNewPassword
          password={password}
          setPassword={setPassword}
          isGenerationAvailable={false}
        />
        <InputTextArea name='Hint' value={hint} setValue={setHint} />
        <Button>Set Master Password</Button>
      </form>
    </div>
  )
}
