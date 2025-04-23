import React from 'react'

import {getUserID, createUserID} from '../hooks/userdata.ts'

export default function UuidManager() {
  const [uuid, setUuid] = React.useState(null)
  const [status, setStatus] = React.useState('loading')
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    async function fetchOrGenerateUuid() {
      try {
        const doc = await getUserID()
        console.log(`doc ${doc}`)
        if (doc && doc.uuid) {
          setUuid(doc.uuid)
          setStatus('loaded_from_local')
          return
        }

        // If we got here, have to request a new UUID
        setStatus('requesting')

        const response = await fetch(
          'http://localhost:3001/api/generate-uuid',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || 'Failed to create user on server')
        }

        const uuid = await createUserID(data.uuid)
        setUuid(uuid)
        setStatus('generated_and_stored')
      } catch (error) {
        console.error('Error in UUID process:', error)
        setStatus('error')
        setError(error.message)
      }
    }

    fetchOrGenerateUuid()
  }, [])

  return (
    <div className='mx-auto max-w-md rounded-xl bg-white p-6 shadow-md'>
      <h2 className='mb-4 text-xl font-bold'>User Identity</h2>

      {status === 'loading' && (
        <div className='flex items-center'>
          <div className='mr-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p>Checking for existing user ID...</p>
        </div>
      )}

      {status === 'requesting' && (
        <div className='flex items-center'>
          <div className='mr-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p>Requesting new user ID from server...</p>
        </div>
      )}

      {(status === 'loaded_from_local' ||
        status === 'generated_and_stored' ||
        status === 'generated_not_stored') && (
        <div>
          <div className='mb-2 flex items-center'>
            <div className='mr-2 h-4 w-4 rounded-full bg-green-500'></div>
            <p className='font-medium'>
              {status === 'loaded_from_local' ?
                'Using existing ID'
              : 'Generated new ID'}
            </p>
          </div>
          <p className='rounded bg-gray-100 p-3 font-mono text-sm break-all'>
            {uuid}
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className='mt-4 border-l-4 border-red-500 bg-red-100 p-4'>
          <p className='text-red-700'>Error: {error}</p>
        </div>
      )}
    </div>
  )
}
