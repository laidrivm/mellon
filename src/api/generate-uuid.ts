/**
 * UUID Generation Service
 * Orchestrates user creation workflow
 */

import {uuidv7} from 'uuidv7'
import type {UserCreationResponse} from '../types.ts'
import {ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {createUserDatabase} from './database-repository.ts'
import {getErrorMessage, isApiError} from './errors.ts'
import {createCouchDbUser} from './user-repository.ts'

/**
 * Generate a new UUID and create associated user resources
 */
export async function generateUUID(): Promise<UserCreationResponse> {
  try {
    const uuid = uuidv7()

    const user = await createCouchDbUser(uuid)
    const db = await createUserDatabase(uuid)

    return {
      success: true,
      message: SUCCESS_MESSAGES.USER_CREATED,
      uuid: user.uuid,
      password: user.password,
      db: db.db
    }
  } catch (error) {
    const errorMessage = isApiError(error)
      ? `${error.code}: ${error.message}`
      : getErrorMessage(error)

    console.error('[GenerateUUID] Error:', errorMessage)

    return {
      success: false,
      error: errorMessage,
      message: ERROR_MESSAGES.UUID_GENERATION_ERROR
    }
  }
}
