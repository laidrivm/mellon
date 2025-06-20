import React from 'react'
import Button from './Button.tsx'
import ButtonShowPassword from './ButtonShowPassword.tsx'
import ButtonCopyPassword from './ButtonCopyPassword.tsx'
import ButtonCopyAll from './ButtonCopyAll.tsx'
import ButtonDeleteSecret from './ButtonDeleteSecret.tsx'
import type {Secret} from '../types.ts'

export default function SecretItem({
  secret,
  removeSecret
}: {
  secret: Secret
  removeSecret: (secretId: string) => void
}): JSX.Element {
  const [open, setOpen] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const hiddenPassword = '*'.repeat(secret.password.length)

  async function handleRemove() {
    setTimeout(() => {
      removeSecret(secret._id)
    }, 0)
  }

  return (
    <li>
      <button
        onClick={() => {
          setOpen(!open)
          setShowPassword(false)
        }}
        className={`group flex items-center space-x-2 text-lg`}
      >
        <span
          className={`transition-transform duration-200 ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        >
          ▼
        </span>
        <span className='transition duration-200 group-hover:underline'>
          {secret.name}
        </span>
      </button>
      {open && (
        <div className='mt-2 ml-6 space-y-2'>
          <p>Username: {secret.username}</p>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              {showPassword ?
                <p>Password: {secret.password}</p>
              : <p>Password: {hiddenPassword}</p>}
            </div>
            <div className='ml-4 flex items-center space-x-2'>
              <ButtonShowPassword
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
              <ButtonCopyPassword password={secret.password} />
            </div>
          </div>
          {secret.notes && (
            <>
              <p>Notes:</p>
              <p>{secret.notes}</p>
            </>
          )}
          <div className='flex items-center justify-between pt-4'>
            <div className='flex items-center space-x-4'>
              <Button>Update</Button>
              <ButtonCopyAll secret={secret} />
            </div>
            <div className='flex items-center'>
              <ButtonDeleteSecret onDelete={handleRemove} />
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
