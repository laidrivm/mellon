import React, {ReactNode} from 'react'

export default function InputTextArea({
  name,
  value,
  setValue
}: {
  name: string
  value: string
  setValue: (value: string) => void
}): ReactNode {
  return (
    <div className='pt-1'>
      <textarea
        className='w-full rounded-lg border border-gray-300 px-3 py-2 placeholder:text-gray-300'
        placeholder={name}
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}
