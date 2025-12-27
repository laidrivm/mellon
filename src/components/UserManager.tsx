import React, {type JSX} from 'react'
import {initializeRemoteDb} from '../services/pouchDB.ts'
import {createUserCredentials, getUserCredentials} from '../services/users.ts'
import type {
  ConnectionState,
  UserCreationResponse,
  UserState
} from '../types.ts'

/**
 * UserManager component to handle user identity states
 * @returns {JSX.Element} UserManager component
 */
export default function UuidManager({
  email,
  setConnectionState
}: {
  email: string | null
  setConnectionState: (connectionState: ConnectionState) => void
}): JSX.Element {
  const [uuid, setUuid] = React.useState<string | null>(null)
  const [userState, setUserState] = React.useState<UserState>('loading')

  const requestNewUuid = React.useCallback(async () => {
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
  }, [setConnectionState])

  React.useEffect(() => {
    let isMounted = true

    async function setupUser() {
      try {
        const doc = await getUserCredentials()

        if (doc?.uuid) {
          if (!isMounted) return

          setUuid(doc.uuid)
          setUserState('has_uuid')

          if (email || doc.email) {
            setUserState('has_email')
          }
        } else {
          if (!isMounted) return
          await requestNewUuid()
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
  }, [email, requestNewUuid])

  return (
    <div className='user-status flex items-center'>
      {userState === 'loading' && (
        <>
          <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500'></div>
          <span>Loading...</span>
        </>
      )}
      {userState === 'no_uuid' && <span>Anonymous</span>}
      {userState === 'has_uuid' && uuid && <span>ID ...{uuid.slice(-5)}</span>}
      {userState === 'has_email' && email && (
        <span>{email.slice(0, 8)}...</span>
      )}
    </div>
  )
}
