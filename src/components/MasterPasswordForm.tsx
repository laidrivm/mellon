import {ReactNode} from 'react'

export default function MasterPasswordForm(): ReactNode {
  return (
    <div className='text-center max-w-sm mx-auto'>
      <h2 className='text-2xl font-semibold mb-2'>Set Master Password</h2>
      <p className='text-sm text-gray-600 mb-4'>
        It will allow you to hide secrets on your device while you’re idle.
      </p>
      <input
        type='password'
        placeholder='Master Password'
        className='w-full px-3 py-2 border rounded mb-2'
      />
      <textarea
        placeholder='Hint'
        className='w-full px-3 py-2 border rounded mb-4'
      />
      <button
        className='bg-neutral-800 text-white px-4 py-1 rounded'
        onClick={() => {}}
      >
        Set Master Password
      </button>
    </div>
  )
}
