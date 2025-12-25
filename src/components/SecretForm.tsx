import React from 'react'
import type {AddSecretFormProps} from '../types.ts'
import Button from './Button.tsx'
import Input from './Input.tsx'
import InputNewPassword from './InputNewPassword.tsx'
import InputTextArea from './InputTextArea.tsx'

export default function AddSecretForm({
  onboarding,
  addSecret,
  handleSetShowForm,
  formError,
  initialData
}: AddSecretFormProps): JSX.Element {
  const [name, setName] = React.useState(initialData?.name || '')
  const [username, setUsername] = React.useState(initialData?.username || '')
  const [password, setPassword] = React.useState(initialData?.password || '')
  const [notes, setNotes] = React.useState(initialData?.notes || '')
  const [passwordError, setPasswordError] = React.useState(false)

  function generateSecretName(): string {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    return `Secret-${day}-${month}-${year}-${hours}-${minutes}-${seconds}`
  }

  function handleAdd(event: React.FormEvent): void {
    event.preventDefault()

    // Reset error state
    setPasswordError(false)

    // Check if password is missing
    if (!password) {
      setPasswordError(true)
      return
    }

    // Generate name if missing
    const secretName = name || generateSecretName()

    // Username is not required, empty string will do
    const nextSecret = {
      name: secretName,
      username,
      password,
      notes
    }

    addSecret(nextSecret)
    setName('')
    setUsername('')
    setPassword('')
    setNotes('')
    setPasswordError(false)
    handleSetShowForm(null)
  }

  function hideTheForm(event): void {
    event.preventDefault()
    handleSetShowForm(null)
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>Add a New Secret</h1>
      {onboarding !== 'finished' && (
        <p className='text-md leading-6'>
          Secrets are encrypted and stored on your device. Might be restored
          from an encrypted server backup.
        </p>
      )}
      <form className='space-y-4 space-x-4' onSubmit={handleAdd}>
        <Input name='Secret Name' value={name} setValue={setName} />
        <Input name='Username' value={username} setValue={setUsername} />
        <InputNewPassword
          password={password}
          setPassword={setPassword}
          isGenerationAvailable={true}
          error={passwordError}
        />
        <InputTextArea name='Notes' value={notes} setValue={setNotes} />
        <Button>Add a Secret</Button>
        {onboarding !== 'secret' && (
          <Button style='secondary' onClick={hideTheForm}>
            Clear and hide
          </Button>
        )}
      </form>
      {formError && <div className='text-md text-red-500'>{formError}</div>}
    </div>
  )
}
