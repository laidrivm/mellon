import PouchDB from 'pouchdb-browser'
import FindPlugin from 'pouchdb-find'

PouchDB.plugin(FindPlugin)

export const localSecretsDB = new PouchDB('mellon')
export const localUserDB = new PouchDB('user_data')

export async function syncOnce() {
  try {
    await localSecretsDB.sync(remoteDB)
    console.log('Sync completed:', result)
  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  }
}

let syncHandler = null

export function startLiveSync(remoteDB) {
  // Cancel any existing sync
  if (syncHandler) {
    syncHandler.cancel()
  }

  // Start bidirectional sync
  syncHandler = localSecretsDB
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

export async function initializeRemoteDb(uuid, password, dbName) {
  try {
    const couchDbHost = 'localhost:5984'

    const remoteDbUrl = `http://${uuid}:${password}@${couchDbHost}/${dbName}`
    console.log(`remoteDbUrl ${remoteDbUrl}`)

    const remoteDB = new PouchDB(remoteDbUrl, {
      skip_setup: true
    })

    await remoteDB.info()

    startLiveSync(remoteDB)

    window.remoteDB = remoteDB

    console.log('Remote database connection established')
    return true
  } catch (err) {
    console.error('Error connecting to remote database:', err)
    return false
  }
}
