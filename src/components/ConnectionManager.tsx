import React, {ReactNode} from 'react'

import {startLiveSync, stopSync} from '../services/pouchDB.ts'

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

export default function ConnectionManager(): ReactNode {
  const isOnline = useOnlineStatus()

  React.useEffect(() => {
    if (isOnline) {
      console.log('Connection restored, syncing data...')
      startLiveSync()
    } else {
      console.log('Connection lost, working offline...')
      stopSync()
    }
  }, [isOnline])

  return (
    <div className='connection-status'>
      {isOnline ? 'Online — Changes will sync' : 'Offline — Working locally'}
    </div>
  )
}
