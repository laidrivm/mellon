import React from 'react'

import {getUserCredentials, createUserCredentials} from '../hooks/userdata.ts'
import {initializeRemoteDb} from '../services/pouchDB.ts'

export default function UuidManager() {
  const [uuid, setUuid] = React.useState(null)
  const [dbName, setDbName] = React.useState(null)
  const [status, setStatus] = React.useState('loading')
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    async function setupUserAndDatabase() {
      try {
        const doc = await getUserCredentials()

        if (doc && doc.uuid && doc.dbName) {
          setUuid(doc.uuid)
          setDbName(doc.dbName)

          // Initialize the connection to the remote database
          console.log(`first ${doc.uuid} ${doc.password} ${doc.dbName}`)
          await initializeRemoteDb(doc.uuid, doc.password, doc.dbName)

          setStatus('connected_to_remote')
          return
        }

        // Have to request a new UUID
        setStatus('requesting')

        const response = await fetch('/api/generate-uuid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || 'Failed to create user on server')
        }

        const uuid = await createUserCredentials(
          data.uuid,
          data.password,
          data.db
        )

        setUuid(uuid)
        setDbName(data.dbName)

        console.log(`second ${data.uuid} ${data.password} ${data.dbName}`)
        await initializeRemoteDb(data.uuid, data.password, data.dbName)

        setStatus('generated_and_stored')
      } catch (error) {
        console.error('Error in UUID process:', error)
        setStatus('error')
        setError(error.message)
      }
    }

    setupUserAndDatabase()
  }, [])

  return (
    <div className='mx-auto max-w-md rounded-xl bg-white p-6 shadow-md'>
      <h2 className='mb-4 text-xl font-bold'>User Identity</h2>

      {status === 'loading' && (
        <div className='flex items-center'>
          <div className='mr-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p>Checking for existing user account...</p>
        </div>
      )}

      {status === 'requesting' && (
        <div className='flex items-center'>
          <div className='mr-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p>Setting up your account...</p>
        </div>
      )}

      {(status === 'connected_to_remote' ||
        status === 'account_created' ||
        status === 'credentials_not_stored' ||
        status === 'connected_after_conflict') && (
        <div>
          <div className='mb-2 flex items-center'>
            <div className='mr-2 h-4 w-4 rounded-full bg-green-500'></div>
            <p className='font-medium'>
              {status === 'connected_to_remote' ?
                'Connected to your account'
              : status === 'connected_after_conflict' ?
                'Connected to your account (resolved conflict)'
              : status === 'account_created' ?
                'Account created successfully'
              : 'Account created but credentials not stored'}
            </p>
          </div>
          <div className='mb-2 rounded bg-gray-100 p-3'>
            <p className='font-mono text-sm break-all'>
              <strong>ID:</strong> {uuid}
            </p>
            <p className='font-mono text-sm break-all'>
              <strong>Database:</strong> {dbName}
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className='mt-4 border-l-4 border-red-500 bg-red-100 p-4'>
          <p className='text-red-700'>Error: {error}</p>
          <button
            className='mt-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600'
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
