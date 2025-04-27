import React from 'react'
import ConnectionManager from './ConnectionManager'
import UserManager from './UserManager'
import logo from '../logo.svg'

console.log(logo)

/**
 * Header component containing logo, connection manager, and user manager
 * @returns {JSX.Element} Header component
 */
export default function Header({email}: {email: string}): JSX.Element {
  const [connectionState, setConnectionState] =
    React.useState<ConnectionState>('connecting')

  return (
    <header className='container mx-auto mt-2 flex w-full max-w-md items-center justify-between bg-white font-light text-black antialiased md:subpixel-antialiased'>
      <div className='flex items-center space-x-4'>
        <div className='flex items-center'>
          <img src={logo} alt='Logo' className='h-8 w-8' />
        </div>

        <ConnectionManager
          connectionState={connectionState}
          setConnectionState={setConnectionState}
        />
      </div>

      <UserManager email={email} setConnectionState={setConnectionState} />
    </header>
  )
}
