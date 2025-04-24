import PouchDB from 'pouchdb-browser'
import FindPlugin from 'pouchdb-find'

import {getUserCredentials} from '../hooks/userdata.ts'

PouchDB.plugin(FindPlugin)

export const localSecretsDB = new PouchDB('mellon')
export const localUserDB = new PouchDB('user_data')

let syncHandler = null

export async function syncOnce() {
  try {
    await localSecretsDB.sync(remoteDB)
    console.log('Sync completed:', result)
  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  }
}

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

    window.remoteDB = remoteDB

    console.log('Remote database connection established')
    return remoteDB
  } catch (err) {
    console.error('Error connecting to remote database:', err)
    return null
  }
}

export async function setupRemoteConnection() {
  try {
    const credentials = await getUserCredentials()

    if (!credentials) {
      console.error('No credentials found')
      return {success: false, error: 'No credentials found'}
    }

    const remoteDB = await initializeRemoteDb(
      credentials.uuid,
      credentials.password,
      credentials.dbName
    )

    if (!remoteDB) {
      return {success: false, error: 'Failed to connect to remote database'}
    }

    startLiveSync(remoteDB)

    return {success: true, uuid: credentials.uuid, dbName: credentials.dbName}
  } catch (error) {
    console.error('Error setting up remote connection:', error)
    return {success: false, error: error.message}
  }
}
