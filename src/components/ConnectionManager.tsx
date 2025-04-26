import React from 'react'

import {stopSync, setupRemoteConnection} from '../services/pouchDB.ts'
import {getUserCredentials} from '../services/users.ts'
import {ConnectionState} from '../types.ts'

/**
 * Custom hook to track online status
 * @returns {boolean} Whether device is online
 */
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * ConnectionManager component to handle connection states with remote database
 * @returns {JSX.Element} ConnectionManager component
 */
export default function ConnectionManager({
  connectionState,
  setConnectionState
}: {
  connectionState: ConnectionState
  setConnectionState: (connectionState: ConnectionState) => void
}): JSX.Element {
  const isOnline = useOnlineStatus()
  const [retryCount, setRetryCount] = React.useState(0)
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const checkConnection = React.useCallback(async () => {
    if (!isOnline) {
      setConnectionState('offline')
      return
    }

    try {
      setConnectionState('connecting')

      // Get credentials and try to establish connection
      const credentials = await getUserCredentials()
      if (!credentials) {
        setConnectionState('local_only')
        console.log('No credentials found, working in local-only mode')
        return
      }

      const result = await setupRemoteConnection(credentials)

      if (result.success) {
        setConnectionState('connected')
        setRetryCount(0)
      } else {
        console.error('Failed to connect to remote database:', result.error)
        setConnectionState('local_only')
        scheduleRetry()
      }
    } catch (error) {
      console.error('Connection check failed:', error)
      setConnectionState('local_only')
      scheduleRetry()
    }
  }, [isOnline])

  const scheduleRetry = React.useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    // Progressive backoff: 1s, 2s, 4s, ... 64s max
    const delay = Math.min(1000 * Math.pow(2, retryCount), 64 * 1000)

    console.log(`Scheduling connection retry in ${delay / 1000} seconds`)

    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount((prev) => prev + 1)
      checkConnection()
    }, delay)
  }, [retryCount, checkConnection])

  React.useEffect(() => {
    checkConnection()

    // Clean up any pending retry on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [isOnline, checkConnection])

  React.useEffect(() => {
    if (isOnline && connectionState === 'connected') {
      console.log('Connection established, syncing data...')
    } else if (!isOnline) {
      console.log('Device offline, working locally...')
      stopSync()
    }
  }, [isOnline, connectionState])

  const getStatusMessage = (): string => {
    switch (connectionState) {
      case 'offline':
        return 'Offline — Working locally'
      case 'connecting':
        return 'Connecting to database...'
      case 'connected':
        return 'Online — Changes will sync'
      case 'local_only':
        return 'Online — Local only (retrying)'
      default:
        return 'Unknown connection state'
    }
  }

  return (
    <div
      className='connection-status flex items-center'
      role='status'
      aria-live='polite'
    >
      <span
        className={`mr-2 h-2 w-2 rounded-full ${
          connectionState === 'offline' ? 'bg-gray-500'
          : connectionState === 'connecting' ? 'animate-pulse bg-yellow-500'
          : connectionState === 'connected' ? 'bg-green-500'
          : 'bg-red-500'
        }`}
      ></span>
      <span>{getStatusMessage()}</span>
    </div>
  )
}
