/**
 * Database Repository Module
 * Handles user database creation and security configuration (Single Responsibility)
 */

import {COUCHDB_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {type CouchClient, getDefaultCouchClient} from './couch-client.ts'
import {DatabaseError, ErrorCode, getErrorMessage} from './errors.ts'

/**
 * Response structure for database creation
 */
export interface DatabaseCreationResult {
  success: boolean
  db: string
  message: string
}

/**
 * CouchDB security document structure
 */
interface SecurityDocument {
  admins: {names: string[]; roles: string[]}
  members: {names: string[]; roles: string[]}
}

/**
 * Dependencies for database repository (enables DI for testing)
 */
export interface DatabaseRepositoryDeps {
  client?: CouchClient
}

/**
 * Generate database name for a user
 */
export function getUserDbName(uuid: string): string {
  return `${COUCHDB_CONSTANTS.USER_DB_PREFIX}${uuid}`
}

/**
 * Build security document for user database
 */
function buildSecurityDocument(uuid: string): SecurityDocument {
  return {
    admins: {names: [], roles: []},
    members: {names: [uuid], roles: []}
  }
}

/**
 * Create a new user database
 */
async function createDatabase(
  client: CouchClient,
  dbName: string
): Promise<void> {
  await client.server.db.create(dbName)
}

/**
 * Set security permissions on a database
 */
async function setDatabaseSecurity(
  client: CouchClient,
  dbName: string,
  securityDoc: SecurityDocument
): Promise<boolean> {
  const response = await client.server.request({
    db: dbName,
    path: COUCHDB_CONSTANTS.SECURITY_PATH,
    method: 'PUT',
    body: securityDoc
  })

  return response.ok === true
}

/**
 * Create user-specific database with proper security settings
 *
 * @param uuid - User identifier to create database for
 * @param deps - Optional dependencies for testing
 * @returns Result of database creation operation
 */
export async function createUserDatabase(
  uuid: string,
  deps: DatabaseRepositoryDeps = {}
): Promise<DatabaseCreationResult> {
  const client = deps.client ?? getDefaultCouchClient()
  const dbName = getUserDbName(uuid)

  try {
    await createDatabase(client, dbName)
    const securityDoc = buildSecurityDocument(uuid)
    const securitySet = await setDatabaseSecurity(client, dbName, securityDoc)

    if (securitySet) {
      return {
        success: true,
        db: dbName,
        message: SUCCESS_MESSAGES.DB_CREATED
      }
    }

    return {
      success: false,
      db: dbName,
      message: `${ERROR_MESSAGES.DB_SECURITY_ERROR}: ${dbName}`
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    console.error(`[DatabaseRepository] ${ERROR_MESSAGES.DB_CREATION_ERROR}:`, {
      dbName,
      error: errorMessage
    })

    throw new DatabaseError(
      dbName,
      ERROR_MESSAGES.DB_CREATION_ERROR,
      ErrorCode.DATABASE_CREATION_FAILED,
      error instanceof Error ? error : undefined
    )
  }
}
