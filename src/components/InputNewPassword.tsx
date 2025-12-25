import React, {type ReactNode} from 'react'
import ButtonShowPassword from './ButtonShowPassword.tsx'

function generateSecurePassword(): string {
  // Character sets (avoiding ambiguous characters like 0, O, l, I, 1)
  const upperLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowerLetters = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const allChars = upperLetters + lowerLetters + numbers

  // Start with a letter (upper or lower)
  const startChars = upperLetters + lowerLetters
  let password = startChars[Math.floor(Math.random() * startChars.length)]

  // Ensure we have at least one of each required type
  const requiredChars = [
    upperLetters[Math.floor(Math.random() * upperLetters.length)],
    lowerLetters[Math.floor(Math.random() * lowerLetters.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)] // At least 2 symbols
  ]

  // Add minumum required characters to password
  for (const char of requiredChars) {
    password += char
  }

  // Fill remaining positions
  while (password.length < 16) {
    const nextChar = allChars[Math.floor(Math.random() * allChars.length)]
    // Avoid consecutive duplicates
    if (nextChar !== password[password.length - 1]) {
      password += nextChar
    }
  }

  // Shuffle the password (except first character) to randomize positions
  const firstChar = password[0]
  const restChars = password.slice(1).split('')

  // Fisher-Yates shuffle
  for (let i = restChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[restChars[i], restChars[j]] = [restChars[j], restChars[i]]
  }

  return firstChar + restChars.join('')
}

export default function InputNewPassword({
  password,
  setPassword,
  isGenerationAvailable,
  error = false
}: {
  password: string
  setPassword: (password: string) => void
  isGenerationAvailable: boolean
  error?: boolean
}): ReactNode {
  const [showPassword, setShowPassword] = React.useState(false)

  // Show error only if error prop is true AND password is empty
  const showError = error && password.length === 0

  const inputClassName = `font-mono w-full rounded-lg border px-3 py-2 placeholder:text-gray-300 ${
    showError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
  }`

  return (
    <div className='relative'>
      <input
        className={inputClassName}
        type={showPassword ? 'text' : 'password'}
        placeholder='Password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className='absolute top-2.5 right-3 flex gap-2 text-sm'>
        <ButtonShowPassword
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />
        {isGenerationAvailable && (
          <button
            type='button'
            onClick={(event) => {
              event.preventDefault()
              setPassword(generateSecurePassword())
            }}
            className='hover:underline'
          >
            Generate
          </button>
        )}
      </div>
      {showError && (
        <p className='mt-1 text-sm text-red-500'>Password is required</p>
      )}
    </div>
  )
}
