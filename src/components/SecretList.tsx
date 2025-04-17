import {ReactNode} from 'react'

export default function SecretList({secrets}): ReactNode {
  return (
    <div className='mt-12'>
      <h2 className='text-3xl'>Stored Secrets</h2>

      {secrets.length !== 0 && (
        <button
          onClick={() => {}}
          className='bg-neutral-800 text-white text-sm px-3 py-1 rounded'
        >
          Add new
        </button>
      )}

      {secrets.length === 0 ?
        <p className='text-md mt-2'>No stored secrets yet</p>
      : <ul className='mt-2 space-y-2'>
          {secrets.map((secret, idx) => (
            <li key={idx} className='border rounded px-3 py-2 bg-gray-50'>
              <div className='font-medium'>{secret.name}</div>
              <div className='text-sm text-gray-600'>{secret.username}</div>
            </li>
          ))}
        </ul>
      }
    </div>
  )
}
