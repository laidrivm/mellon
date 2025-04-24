import React from 'react'

import {stopSync, setupRemoteConnection} from '../services/pouchDB.ts'
import {getUserCredentials, isAuthenticated} from '../services/users.ts'
import {ConnectionStatus} from '../types.ts'

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
 * Custom hook to track connection status with remote database
 * @returns {ConnectionStatus} Current connection status
 */
function useConnectionStatus(): ConnectionStatus {
  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>('checking')

  React.useEffect(() => {
    let isMounted = true

    const checkConnection = async () => {
      if (!isMounted) return

      setConnectionStatus('checking')

      try {
        // First check if user is authenticated
        const auth = await isAuthenticated()

        if (!auth) {
          setConnectionStatus('no_credentials')
          return
        }

        // Get credentials and try to establish connection
        const credentials = await getUserCredentials()

        if (!credentials) {
          setConnectionStatus('no_credentials')
          return
        }

        const result = await setupRemoteConnection(credentials)

        if (result.success) {
          setConnectionStatus('connected')
        } else {
          setConnectionStatus('error')
        }
      } catch (error) {
        console.error('Connection check failed:', error)
        setConnectionStatus('error')
      }
    }

    // Check connection immediately and then every minute
    checkConnection()
    const interval = setInterval(checkConnection, 60 * 1000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return connectionStatus
}

/**
 * ConnectionManager component
 * @returns {JSX.Element} ConnectionManager component
 */
export default function ConnectionManager(): JSX.Element {
  const isOnline = useOnlineStatus()
  const connectionStatus = useConnectionStatus()
  const isConnected = connectionStatus === 'connected'

  React.useEffect(() => {
    if (isOnline && isConnected) {
      console.log('Connection restored, syncing data...')
    } else {
      console.log('Connection lost, working offline...')
      stopSync()
    }
  }, [isOnline, isConnected])

  const getStatusMessage = (): string => {
    if (!isOnline) return 'Offline — Working locally'

    switch (connectionStatus) {
      case 'connected':
        return 'Online — Changes will sync'
      case 'checking':
        return 'Checking connection...'
      case 'no_credentials':
        return 'Online — Local only (no account)'
      case 'error':
        return 'Online — Sync error (retrying)'
      default:
        return 'Connection status unknown'
    }
  }

  return (
    <div className='connection-status' role='status' aria-live='polite'>
      <span
        className={`status-indicator ${isOnline ? 'online' : 'offline'}`}
      ></span>
      {getStatusMessage()}
    </div>
  )
}
