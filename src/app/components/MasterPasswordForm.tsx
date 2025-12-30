import React, {type JSX} from 'react'
import type {MasterPassword, MasterPasswordFormProps} from '../../types.ts'
import Button from './Button.tsx'
import InputNewPassword from './InputNewPassword.tsx'
import InputTextArea from './InputTextArea.tsx'

export default function MasterPasswordForm({
  addMasterPassword,
  handleSetShowForm,
  formError,
  initialData
}: MasterPasswordFormProps): JSX.Element {
  const [password, setPassword] = React.useState(initialData?.password || '')
  const [hint, setHint] = React.useState(initialData?.hint || '')
  const [passwordError, setPasswordError] = React.useState(false)

  function handleMasterPassword(event: React.FormEvent): void {
    event.preventDefault()

    // Reset error state
    setPasswordError(false)

    // Check if password is missing
    if (!password) {
      setPasswordError(true)
      return
    }

    const masterPassword: MasterPassword = {password, hint}
    addMasterPassword(masterPassword)
    setPassword('')
    setHint('')
    setPasswordError(false)
    handleSetShowForm(null)
  }

  // Update form fields when initialData changes (on error)
  React.useEffect(() => {
    if (initialData) {
      setPassword(initialData.password || '')
      setHint(initialData.hint || '')
    }
  }, [initialData])

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>Set Master Password</h1>
      <p className='text-md leading-6'>
        Set the master password to hide secrets when you are idle and encrypt
        the local data.
      </p>
      <form className='space-y-4' onSubmit={handleMasterPassword}>
        <InputNewPassword
          password={password}
          setPassword={setPassword}
          isGenerationAvailable={false}
          error={passwordError}
        />
        <InputTextArea name='Hint' value={hint} setValue={setHint} />
        <Button>Set Master Password</Button>
      </form>
      {formError && <div className='text-md text-red-500'>{formError}</div>}
    </div>
  )
}
