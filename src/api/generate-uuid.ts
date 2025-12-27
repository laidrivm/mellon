import {uuidv7} from 'uuidv7'
import {
  createCouchDbUser,
  createUserRelatedCouchDb
} from '../services/couchDB.ts'

import type {ServiceResponse, UserCreationResponse} from '../types.ts'

/**
 * Generate a new UUID for user
 * @returns {Promise<ServiceResponse<UserCreationResponse>>} Generated UUID and credentials
 */
export async function generateUUID(): Promise<
  ServiceResponse<UserCreationResponse>
> {
  try {
    const uuid = uuidv7()

    const user = await createCouchDbUser(uuid)
    const db = await createUserRelatedCouchDb(uuid)

    const response: ServiceResponse<UserCreationResponse> = {
      success: true,
      message: 'User created successfully',
      data: {
        ...user,
        ...db,
        success: true
      }
    }

    return response
  } catch (error) {
    console.error('Error generating UUID:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to generate UUID or create user'
    }
  }
}
