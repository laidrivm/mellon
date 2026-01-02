/**
 * UUID Generation Service
 * Orchestrates user creation workflow
 */

import {uuidv7} from 'uuidv7'
import type {ServiceResponse, UserCreationResponse} from '../types.ts'
import {ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {
  createUserDatabase,
  type DatabaseCreationResult
} from './database-repository.ts'
import {getErrorMessage, isApiError} from './errors.ts'
import {createCouchDbUser, type UserCreationResult} from './user-repository.ts'

/**
 * UUID generator interface for dependency injection
 */
export interface UuidGenerator {
  generate(): string
}

/**
 * User service interface for dependency injection
 */
export interface UserService {
  createUser(uuid: string): Promise<UserCreationResult>
  createDatabase(uuid: string): Promise<DatabaseCreationResult>
}

/**
 * Dependencies for UUID generation service
 */
export interface GenerateUuidDeps {
  uuidGenerator?: UuidGenerator
  userService?: UserService
}

/**
 * Default UUID generator using uuidv7
 */
const defaultUuidGenerator: UuidGenerator = {
  generate: uuidv7
}

/**
 * Default user service using repository functions
 */
const defaultUserService: UserService = {
  createUser: createCouchDbUser,
  createDatabase: createUserDatabase
}

/**
 * Build success response from creation results
 */
function buildSuccessResponse(
  user: UserCreationResult,
  db: DatabaseCreationResult
): ServiceResponse<UserCreationResponse> {
  return {
    success: true,
    message: SUCCESS_MESSAGES.USER_CREATED,
    data: {
      success: true,
      uuid: user.uuid,
      password: user.password,
      db: db.db
    }
  }
}

/**
 * Build error response from error
 */
function buildErrorResponse(
  error: unknown
): ServiceResponse<UserCreationResponse> {
  const errorMessage = isApiError(error)
    ? `${error.code}: ${error.message}`
    : getErrorMessage(error)

  return {
    success: false,
    error: errorMessage,
    message: ERROR_MESSAGES.UUID_GENERATION_ERROR
  }
}

/**
 * Generate a new UUID and create associated user resources
 *
 * @param deps - Optional dependencies for testing
 * @returns Service response with user creation data or error
 */
export async function generateUUID(
  deps: GenerateUuidDeps = {}
): Promise<ServiceResponse<UserCreationResponse>> {
  const uuidGen = deps.uuidGenerator ?? defaultUuidGenerator
  const userService = deps.userService ?? defaultUserService

  try {
    const uuid = uuidGen.generate()

    const user = await userService.createUser(uuid)
    const db = await userService.createDatabase(uuid)

    return buildSuccessResponse(user, db)
  } catch (error) {
    console.error('[GenerateUUID] Error:', getErrorMessage(error))
    return buildErrorResponse(error)
  }
}
