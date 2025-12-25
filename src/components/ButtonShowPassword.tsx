import type {ReactNode} from 'react'

export default function ButtonShowPassword({
  showPassword,
  setShowPassword
}: {
  showPassword: boolean
  setShowPassword: (showPassword: boolean) => void
}): ReactNode {
  return (
    <button
      type='button'
      onClick={(event) => {
        event.preventDefault()
        setShowPassword((s) => !s)
      }}
      className='hover:underline'
    >
      {showPassword ? 'Hide' : 'Show'}
    </button>
  )
}
