import React, {ReactNode} from 'react'

import Input from './Input.tsx'
import InputNewPassword from './InputNewPassword.tsx'
import InputTextArea from './InputTextArea.tsx'
import Button from './Button.tsx'

export default function AddSecretForm({
  secretsNumber,
  addSecret
}: {
  secretsNumber: number
  addSecret: (secret: any) => void
}): ReactNode {
  const [name, setName] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const handleAdd = (event) => {
    event.preventDefault()
    if (!name || !username || !password) return
    addSecret({name, username, password, notes})
    setName('')
    setUsername('')
    setPassword('')
    setNotes('')
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-xl text-center'>
        {secretsNumber ? 'Add New Secret' : 'Add Your First Secret'}
      </h1>

      <p className='text-md leading-6'>
        It will be encrypted and stored on your device. You will be able to
        restore it from an encrypted backup from our server in case you clean up
        browser local storage.
      </p>

      <form
        className='space-y-4'
        onSubmit={handleAdd}
      >
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
