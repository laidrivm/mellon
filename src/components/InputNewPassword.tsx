import React, {ReactNode} from 'react'

import ButtonShowPassword from './ButtonShowPassword.tsx'

export default function InputNewPassword({
  password,
  setPassword,
  isGenerationAvailable
}: {
  password: string
  setValue: (password: string) => void
  isGenerationAvailable: string
}): ReactNode {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className='relative'>
      <input
        className='w-full rounded-lg border border-gray-300 px-3 py-2 placeholder:text-gray-300'
        type={showPassword ? 'text' : 'password'}
        placeholder='Password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className='absolute top-1/2 right-3 flex -translate-y-1/2 transform gap-2 text-sm'>
        <ButtonShowPassword
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />
        {isGenerationAvailable && (
          <button
            onClick={(event) => {
              event.preventDefault()
              setPassword(crypto.randomUUID())
            }}
            className='hover:underline'
          >
            Generate
          </button>
        )}
      </div>
    </div>
  )
}
