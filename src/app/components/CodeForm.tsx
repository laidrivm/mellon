import type {JSX} from 'react'
import SingleInputForm from './SingleInputForm.tsx'

interface CodeFormProps {
  email: string
  handleCode: (code: string) => void
  formError?: string | null
}

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
