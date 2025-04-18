import React, {ReactNode} from 'react'

import Input from './Input.tsx'
import InputNewPassword from './InputNewPassword.tsx'
import InputTextArea from './InputTextArea.tsx'
import Button from './Button.tsx'

export default function AddSecretForm({
  secretsNumber,
  addSecret,
  setShowSecretForm
}: {
  secretsNumber: number
  addSecret: (secret: any) => void
  setShowSecretForm: (showSecretForm: boolean) => void
}): ReactNode {
  const [name, setName] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [notes, setNotes] = React.useState('')

  function handleAdd(event): void {
    event.preventDefault()
    if (!name || !username || !password) return
    addSecret({name, username, password, notes})
    setName('')
    setUsername('')
    setPassword('')
    setNotes('')
    setShowSecretForm(false)
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>
        {secretsNumber ? 'Add New Secret' : 'Add Your First Secret'}
      </h1>

      <p className='text-md leading-6'>
        Secrets are encrypted and stored on your device. Might be restored from
        an encrypted server backup.
      </p>

      <form className='space-y-4' onSubmit={handleAdd}>
        <Input name='Secret Name' value={name} setValue={setName} />
        <Input name='Username' value={username} setValue={setUsername} />
        <InputNewPassword
          password={password}
          setPassword={setPassword}
          isGenerationAvailable={true}
        />
        <InputTextArea name='Notes' value={notes} setValue={setNotes} />
        <Button>Add New Secret</Button>
      </form>
    </div>
  )
}
