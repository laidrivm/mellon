import type {JSX} from 'react'
import type {SignUpFormProps} from '../../types.ts'
import SingleInputForm from './SingleInputForm.tsx'

export default function SignUpForm({
  handleEmail,
  formError
}: SignUpFormProps): JSX.Element {
  return (
    <SingleInputForm
      title='Sign Up'
      description='It will allow you to share secrets across devices and enable two-factor authorisation.'
      inputLabel='Email'
      buttonLabel='Sign Up'
      onSubmit={handleEmail}
      formError={formError}
    />
  )
}
