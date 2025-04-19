import React, {ReactNode} from 'react'

import Input from './Input.tsx'
import Button from './Button.tsx'

export default function SignUpForm({
  setEmail
}: {
  setEmail: (email: string) => void
}): ReactNode {
  const [emailInput, setEmailInput] = React.useState('')

  function handleEmail(event): void {
    event.preventDefault()
    setEmail(emailInput)
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>Sign Up</h1>
      <p className='text-md leading-6'>
        It will allow you to share secrets across devices and enable two-factor
        authorisation.
      </p>
      <form className='space-y-4' onSubmit={handleEmail}>
        <Input name='Email' value={emailInput} setValue={setEmailInput} />
        <Button>Sign Up</Button>
      </form>
    </div>
  )
}
