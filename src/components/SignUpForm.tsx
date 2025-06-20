import React from 'react'

import Input from './Input.tsx'
import Button from './Button.tsx'

import type {SignUpFormProps} from '../types.ts'

export default function SignUpForm({
  handleEmail,
  formError
}: SignUpFormProps): JSX.Element {
  const [emailInput, setEmailInput] = React.useState('')

  function addEmail(event): void {
    event.preventDefault()
    handleEmail(emailInput)
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>Sign Up</h1>
      <p className='text-md leading-6'>
        It will allow you to share secrets across devices and enable two-factor
        authorisation.
      </p>
      <form className='space-y-4' onSubmit={addEmail}>
        <Input name='Email' value={emailInput} setValue={setEmailInput} />
        <Button>Sign Up</Button>
      </form>
      {formError && <div className='text-md text-red-500'>{formError}</div>}
    </div>
  )
}
