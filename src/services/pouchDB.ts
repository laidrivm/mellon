import PouchDB from 'pouchdb-browser'
import {v7 as uuidv7} from 'uuid'

import {DbName, ServiceResponse, UserCredentials} from '../types'

// Database instances
export const localSecretsDB = new PouchDB(DbName.SECRETS)
export const localUserDB = new PouchDB(DbName.USER)

// Sync handler to manage live replication
let syncHandler: PouchDB.Replication.Sync<object> | null = null

/**
 * Validate database credentials to prevent injection
 * @param {string} uuid - User UUID
 * @param {string} password - User password
 * @param {string} dbName - Database name
 * @returns {boolean} Whether credentials are valid
 */
function isValidDbCredentials(
  uuid: string,
  password: string,
  dbName: string
): boolean {
  // UUID should be a valid UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Basic validation rules
  return (
    uuidRegex.test(uuid) &&
    typeof password === 'string' &&
    password.length > 0 &&
    typeof dbName === 'string' &&
    /^[a-z0-9_-]+$/.test(dbName)
  )
}

/**
 * Initialize connection to remote database
 * @param {string} uuid - User UUID
 * @param {string} password - User password
 * @param {string} dbName - Database name
 * @returns {Promise<PouchDB.Database | null>} Connected remote database or null
 */
export async function initializeRemoteDb(
  uuid: string,
  password: string,
  dbName: string
): Promise<PouchDB.Database | null> {
  try {
    // Validate inputs to prevent injection
    if (!isValidDbCredentials(uuid, password, dbName)) {
      console.error('Invalid database credentials')
      return null
    }

    const couchDbHost = 'localhost:5984'
    const remoteDbUrl = `http://${uuid}:${password}@${couchDbHost}/${dbName}`

    const remoteDB = new PouchDB(remoteDbUrl, {skip_setup: true})

    // Test connection by fetching database info
    await remoteDB.info()

    console.log('Remote database connection established')
    return remoteDB
  } catch (error) {
    console.error('Error connecting to remote database:', error)
    return null
  }
}

/**
 * Start live synchronization with remote database
 * @param {PouchDB.Database} remoteDB - Remote database instance
 * @returns {PouchDB.Replication.Sync<{}>} Sync handler
 */
export function startLiveSync(
  remoteDB: PouchDB.Database
): PouchDB.Replication.Sync<object> {
  // Cancel existing sync if running
  if (syncHandler) {
    syncHandler.cancel()
  }

  // Configure and start bidirectional sync
  syncHandler = localSecretsDB
    .sync(remoteDB, {
      live: true,
      retry: true,
      heartbeat: 30000,
      back_off_function: (delay) =>
        delay === 0 ? 1000 : Math.min(delay * 3, 60000)
    })
    .on('change', (change) => {
      console.log('Sync change:', change)
    })
    .on('paused', () => {
      console.log('Sync paused')
    })
    .on('active', () => {
      console.log('Sync active')
    })
    .on('denied', (err) => {
      console.error('Sync denied:', err)
    })
    .on('complete', () => {
      console.log('Sync completed')
    })
    .on('error', (err) => {
      console.error('Sync error:', err)
    })

  return syncHandler
}

/**
 * Stop current synchronization
 */
export function stopSync(): void {
  if (syncHandler) {
    syncHandler.cancel()
    syncHandler = null
  }
}

/**
 * Perform one-time synchronization with remote database
 * @param {PouchDB.Database} remoteDB - Remote database instance
 * @returns {Promise<ServiceResponse>} Result of sync operation
 */
export async function syncOnce(
  remoteDB: PouchDB.Database
): Promise<ServiceResponse> {
  try {
    const result = await localSecretsDB.sync(remoteDB)
    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('One-time sync failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * Setup remote connection using stored credentials
 * @param {UserCredentials} credentials - User credentials
 * @returns {Promise<ServiceResponse>} Connection result
 */
export async function setupRemoteConnection(
  credentials: UserCredentials
): Promise<ServiceResponse> {
  try {
    if (
      !credentials ||
      !credentials.uuid ||
      !credentials.password ||
      !credentials.dbName
    ) {
      return {success: false, message: 'Invalid credentials'}
    }

    const remoteDB = await initializeRemoteDb(
      credentials.uuid,
      credentials.password,
      credentials.dbName
    )

    if (!remoteDB) {
      return {success: false, message: 'Failed to connect to remote database'}
    }

    startLiveSync(remoteDB)

    return {
      success: true,
      data: {uuid: credentials.uuid, dbName: credentials.dbName}
    }
  } catch (error) {
    console.error('Error setting up remote connection:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Generate a unique document ID
 * @param {string} prefix - Document type prefix
 * @returns {string} Unique document ID
 */
export function generateDocId(prefix: string): string {
  return `${prefix}:${uuidv7()}`
}
