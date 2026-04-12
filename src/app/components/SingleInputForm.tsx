import React, {type JSX} from 'react'
import Button from './Button.tsx'
import Input from './Input.tsx'

interface SingleInputFormProps {
  title: string
  description: string
  inputLabel: string
  buttonLabel: string
  onSubmit: (value: string) => void
  formError?: string | null
}

export default function SingleInputForm({
  title,
  description,
  inputLabel,
  buttonLabel,
  onSubmit,
  formError
}: SingleInputFormProps): JSX.Element {
  const [value, setValue] = React.useState('')

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    onSubmit(value)
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-center text-xl'>{title}</h1>
      <p className='text-md leading-6'>{description}</p>
      <form className='space-y-4' onSubmit={submit}>
        <Input name={inputLabel} value={value} setValue={setValue} />
        <Button>{buttonLabel}</Button>
      </form>
      {formError && <div className='text-md text-red-500'>{formError}</div>}
    </div>
  )
}
