import React, {ReactNode} from 'react'

import {stopSync, setupRemoteConnection} from '../services/pouchDB.ts'
import {isAuthenticated} from '../hooks/userdata.ts'

function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)

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

function useConnectionStatus() {
  const [connectionStatus, setConnectionStatus] = React.useState('checking')

  React.useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking')

      // First check if user is authenticated
      const auth = await isAuthenticated()
      if (!auth) {
        setConnectionStatus('no_credentials')
        return
      }

      // Try to establish connection
      const result = await setupRemoteConnection()

      if (result.success) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    }

    checkConnection()

    const interval = setInterval(checkConnection, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  return connectionStatus
}

export default function ConnectionManager(): ReactNode {
  const isOnline = useOnlineStatus()
  const isConnected = useConnectionStatus() === 'connected'

  React.useEffect(() => {
    if (isOnline && isConnected) {
      console.log('Connection restored, syncing data...')
    } else {
      console.log('Connection lost, working offline...')
      stopSync()
    }
  }, [isConnected])

  return (
    <div className='connection-status'>
      {isOnline ? 'Online — Changes will sync' : 'Offline — Working locally'}
    </div>
  )
}
