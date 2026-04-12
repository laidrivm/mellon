import type {JSX} from 'react'
import type {CodeFormProps} from '../../types.ts'
import SingleInputForm from './SingleInputForm.tsx'

export default function CodeForm({
  email,
  handleCode,
  formError
}: CodeFormProps): JSX.Element {
  return (
    <SingleInputForm
      title='Verify Email'
      description={`We sent a code to ${email}. Please copy paste it here:`}
      inputLabel='Code'
      buttonLabel='Verify'
      onSubmit={handleCode}
      formError={formError}
    />
  )
}
