import React from 'react'

import {getUserCredentials, createUserCredentials} from '../services/users.ts'
import {initializeRemoteDb} from '../services/pouchDB.ts'
import {UserCreationResponse} from '../types.ts'

type UuidStatus =
  | 'loading'
  | 'requesting'
  | 'connected_to_remote'
  | 'generated_and_stored'
  | 'account_created'
  | 'credentials_not_stored'
  | 'connected_after_conflict'
  | 'error'

/**
 * UuidManager component
 * @returns {JSX.Element} UuidManager component
 */
export default function UuidManager(): JSX.Element {
  const [uuid, setUuid] = React.useState<string | null>(null)
  const [dbName, setDbName] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<UuidStatus>('loading')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isMounted = true

    async function setupUserAndDatabase() {
      try {
        // Check for existing credentials
        const doc = await getUserCredentials()

        if (doc && doc.uuid && doc.dbName) {
          if (!isMounted) return

          setUuid(doc.uuid)
          setDbName(doc.dbName)

          // Initialize connection to remote database
          const remoteDb = await initializeRemoteDb(
            doc.uuid,
            doc.password,
            doc.dbName
          )

          if (!isMounted) return

          if (remoteDb) {
            setStatus('connected_to_remote')
          } else {
            setStatus('error')
            setError('Failed to connect to remote database')
          }
          return
        }

        // Need to request a new UUID from server
        if (!isMounted) return
        setStatus('requesting')

        // Call API to generate UUID
        const response = await fetch('/api/generate-uuid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!isMounted) return

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`)
        }

        const data = (await response.json()) as UserCreationResponse

        if (!data.success) {
          throw new Error(data.message || 'Failed to create user on server')
        }

        // Store credentials locally
        if (data.uuid && data.password && data.db) {
          const result = await createUserCredentials(
            data.uuid,
            data.password,
            data.db
          )

          if (!isMounted) return

          if (result.success) {
            setUuid(data.uuid)
            setDbName(data.db)

            // Initialize remote connection
            await initializeRemoteDb(data.uuid, data.password, data.db)

            if (!isMounted) return
            setStatus('generated_and_stored')
          } else {
            setStatus('credentials_not_stored')
            setError('Failed to store credentials locally')
          }
        } else {
          if (!isMounted) return
          setStatus('error')
          setError('Server response missing required data')
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Error in UUID setup process:', error)
        setStatus('error')
        setError(error instanceof Error ? error.message : String(error))
      }
    }

    setupUserAndDatabase()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [])

  if (status === 'loading' || status === 'requesting') {
    return (
      <div className='mx-auto max-w-md rounded-xl bg-white p-6 shadow-md'>
        <h2 className='mb-4 text-xl font-bold'>User Identity</h2>
        <div className='flex items-center'>
          <div className='mr-2 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <p>
            {status === 'loading' ?
              'Checking for existing user account...'
            : 'Setting up your account...'}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className='mx-auto max-w-md rounded-xl bg-white p-6 shadow-md'>
        <h2 className='mb-4 text-xl font-bold'>User Identity</h2>
        <div className='mt-4 border-l-4 border-red-500 bg-red-100 p-4'>
          <p className='text-red-700'>Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-md rounded-xl bg-white p-6 shadow-md'>
      <h2 className='mb-4 text-xl font-bold'>User Identity</h2>
      <div>
        <div className='mb-2 flex items-center'>
          <div className='mr-2 h-4 w-4 rounded-full bg-green-500'></div>
          <p className='font-medium'>
            {status === 'connected_to_remote' ?
              'Connected to your account'
            : status === 'connected_after_conflict' ?
              'Connected to your account (resolved conflict)'
            : status === 'generated_and_stored' ?
              'Account created successfully'
            : 'Account created but credentials not stored'}
          </p>
        </div>
        {uuid && dbName && (
          <div className='mb-2 rounded bg-gray-100 p-3'>
            <p className='font-mono text-sm break-all'>
              <strong>ID:</strong> {uuid}
            </p>
            <p className='font-mono text-sm break-all'>
              <strong>Database:</strong> {dbName}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
