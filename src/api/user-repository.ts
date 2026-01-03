/**
 * User Repository Module
 * Handles CouchDB user creation operations (Single Responsibility)
 */

import {COUCHDB_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {type CouchClient, createCouchClient} from './couch-client.ts'
import {getErrorMessage, UserCreationError} from './errors.ts'
import {generateSecurePassword} from './password.ts'

/**
 * Response structure for user creation
 */
export interface UserCreationResult {
  success: boolean
  uuid: string
  password?: string
  message: string
}

/**
 * Dependencies for user repository (enables DI for testing)
 */
export interface UserRepositoryDeps {
  client?: CouchClient
}

/**
 * Build CouchDB user document
 */
function buildUserDocument(uuid: string, password: string) {
  return {
    _id: `${COUCHDB_CONSTANTS.USER_PREFIX}${uuid}`,
    name: uuid,
    type: COUCHDB_CONSTANTS.USER_TYPE,
    roles: [] as string[],
    password
  }
}

/**
 * Create a new CouchDB user with generated password
 *
 * @param uuid - Unique identifier for the user
 * @param deps - Optional dependencies for testing
 * @returns Result of user creation operation
 */
export async function createCouchDbUser(
  uuid: string,
  deps: UserRepositoryDeps = {}
): Promise<UserCreationResult> {
  const client = deps.client ?? createCouchClient()
  const password = generateSecurePassword()
  const userDoc = buildUserDocument(uuid, password)

  try {
    const usersDb = client.server.use(COUCHDB_CONSTANTS.USERS_DB)
    const response = await usersDb.insert(userDoc)

    if (response.ok) {
      return {
        success: true,
        uuid,
        password,
        message: SUCCESS_MESSAGES.USER_CREATED
      }
    }

    return {
      success: false,
      uuid,
      message: ERROR_MESSAGES.USER_CREATION_FAILED
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    console.error(`[UserRepository] ${ERROR_MESSAGES.USER_CREATION_ERROR}:`, {
      uuid,
      error: errorMessage
    })

    throw new UserCreationError(
      uuid,
      ERROR_MESSAGES.USER_CREATION_ERROR,
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Check if error indicates user already exists
 */
export function isUserExistsError(error: unknown): boolean {
  if (error instanceof UserCreationError && error.cause) {
    const causeMessage = error.cause.message.toLowerCase()
    return causeMessage.includes('conflict') || causeMessage.includes('exists')
  }
  return false
}
