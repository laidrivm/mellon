import React, {ReactNode} from 'react'

export default function Input({
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
      <input
        className='w-full border rounded-lg border-gray-300 placeholder:text-gray-300 px-3 py-2'
        placeholder={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  )
}
