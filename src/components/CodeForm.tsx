import React from 'react'

import Input from './Input.tsx'
import Button from './Button.tsx'

import type {CodeFormProps} from '../types.ts'

export default function CodeForm({
  email,
  handleCode,
  formError
}: CodeFormProps): JSX.Element {
  const [codeInput, setCodeInput] = React.useState('')

  function verifyCode(event): void {
    event.preventDefault()
    handleCode(codeInput)
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>Verify Email</h1>
      <p className='text-md leading-6'>
        We sent a code to {email}. Please copy paste it here:
      </p>
      <form className='space-y-4' onSubmit={verifyCode}>
        <Input name='Code' value={codeInput} setValue={setCodeInput} />
        <Button>Verify</Button>
      </form>
      {formError && <div className='text-md text-red-500'>{formError}</div>}
    </div>
  )
}
