import React from 'react'

import {getUserCredentials, createUserCredentials} from '../services/users.ts'
import {initializeRemoteDb} from '../services/pouchDB.ts'
import {UserCreationResponse} from '../types.ts'
import type {UserState, ConnectionState} from '../types.ts'

/**
 * UserManager component to handle user identity states
 * @returns {JSX.Element} UserManager component
 */
export default function UuidManager({
  setConnectionState
}: {
  setConnectionState: (connectionState: ConnectionState) => void
}): JSX.Element {
  const [uuid, setUuid] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [userState, setUserState] = React.useState<UserState>('loading')

  async function requestNewUuid() {
    try {
      const response = await fetch('/api/generate-uuid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = (await response.json()) as UserCreationResponse

      if (!data.success) {
        throw new Error(data.message || 'Failed to create user on server')
      }

      if (data.uuid && data.password && data.db) {
        const result = await createUserCredentials(
          data.uuid,
          data.password,
          data.db
        )

        if (result.success) {
          setUuid(data.uuid)
          setUserState('has_uuid')
          setConnectionState('connected')

          await initializeRemoteDb(data.uuid, data.password, data.db)
        } else {
          console.error('Failed to store credentials locally')
        }
      } else {
        console.error('Server response missing required data')
      }
    } catch (error) {
      console.error('Error in UUID request process:', error)
    }
  }

  React.useEffect(() => {
    let isMounted = true

    async function setupUser() {
      try {
        const doc = await getUserCredentials()

        if (doc && doc.uuid) {
          if (!isMounted) return

          setUuid(doc.uuid)
          setUserState('has_uuid')

          if (doc.email) {
            setEmail(doc.email)
            setUserState('has_email')
          }
        } else {
          if (!isMounted) return
          await requestNewUuid() // missing
        }
      } catch (error) {
        console.error('Error in user setup:', error)
        if (!isMounted) return
        setUserState('no_uuid')
      }
    }

    setupUser()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className='user-status flex items-center'>
      {userState === 'loading' && (
        <>
          <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <span>Loading...</span>
        </>
      )}
      {userState === 'no_uuid' && <span>Anonymous</span>}
      {userState === 'has_uuid' && <span>ID ...{uuid.slice(-5)}</span>}
      {userState === 'has_email' && <span>{email}</span>}
    </div>
  )
}

/*

  if (isInitializing) {
    return (
      <div className="user-status flex items-center">
        
      </div>
    );
  }
  
  return (
    <div className="user-status">
      {userState === 'no_uuid' ? (
        <button 
          onClick={requestNewUuid}
          className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Account
        </button>
      ) : userState === 'has_uuid' ? (
        <div className="flex items-center">
          <div className="flex items-center">
            <div className="h-4 w-4 rounded-full bg-blue-500 mr-1"></div>
            <span className="text-sm mr-2">Anonymous</span>
          </div>
          <button 
            onClick={handleAddEmail}
            className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Email
          </button>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="h-4 w-4 rounded-full bg-green-500 mr-1"></div>
          <span className="text-sm">{email}</span>
        </div>
      )}
    </div>
  );
*/
