import React, {ReactNode} from 'react'

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
        className='w-full border rounded-lg border-gray-300 placeholder:text-gray-300 px-3 py-2'
        type={showPassword ? 'text' : 'password'}
        placeholder='Password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-2 text-sm'>
        <button
          onClick={(event) => {
            event.preventDefault()
            setShowPassword((s) => !s)
          }}
          className='hover:underline'
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
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
