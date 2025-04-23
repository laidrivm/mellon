import PouchDB from 'pouchdb-browser'
import FindPlugin from 'pouchdb-find'

PouchDB.plugin(FindPlugin)

export const localDB = new PouchDB('mellon')

export const remoteDB = new PouchDB(
  'http://admin:password@localhost:5984/mellon'
)

export async function syncOnce() {
  try {
    await localDB.sync(remoteDB)
    console.log('Sync completed:', result)
  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  }
}

let syncHandler = null

export function startLiveSync() {
  // Cancel any existing sync
  if (syncHandler) {
    syncHandler.cancel()
  }

  // Start bidirectional sync
  syncHandler = localDB
    .sync(remoteDB, {
      live: true, // Keep sync going
      retry: true, // Retry if connection fails
      heartbeat: 30 * 1000, // Send heartbeat every 30 seconds
      back_off_function: (delay) =>
        delay === 0 ? 1000 : Math.min(delay * 3, 60000)
    })
    .on('change', (change) => {
      console.log('Sync change:', change)
    })
    .on('paused', (info) => {
      console.log('Sync paused:', info)
    })
    .on('active', (info) => {
      console.log('Sync active:', info)
    })
    .on('denied', (err) => {
      console.error('Sync denied:', err)
    })
    .on('complete', (info) => {
      console.log('Sync completed:', info)
    })
    .on('error', (err) => {
      console.error('Sync error:', err)
    })

  return syncHandler
}

export function stopSync() {
  if (syncHandler) {
    syncHandler.cancel()
    syncHandler = null
  }
}
