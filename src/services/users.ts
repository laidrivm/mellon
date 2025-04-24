import {localUserDB} from '../services/pouchDB.ts'
import {DocType, UserCredentials, ServiceResponse} from '../types.ts'

/**
 * Retrieve user credentials from local database
 * @returns {Promise<UserCredentials | null>} User credentials or null if not found
 */
export async function getUserCredentials(): Promise<UserCredentials | null> {
  try {
    const doc = await localUserDB.get(`${DocType.USER_CREDENTIALS}`)
    return {
      uuid: doc.uuid,
      password: doc.password,
      dbName: doc.dbName,
      createdAt: doc.createdAt
    }
  } catch (error) {
    if (error.name !== 'not_found') {
      console.error('Error getting user credentials:', error)
    }
    return null
  }
}

/**
 * Create and store user credentials
 * @param {string} uuid - User UUID
 * @param {string} password - User password
 * @param {string} dbName - Database name
 * @returns {Promise<ServiceResponse>} Operation result
 */
export async function createUserCredentials(
  uuid: string,
  password: string,
  dbName: string
): Promise<ServiceResponse> {
  try {
    if (!uuid || !password || !dbName) {
      return {success: false, message: 'Invalid credentials data'}
    }

    await localUserDB.put({
      _id: DocType.USER_CREDENTIALS,
      uuid,
      password,
      dbName,
      createdAt: new Date().toISOString()
    })

    return {
      success: true,
      data: {uuid, dbName}
    }
  } catch (error) {
    console.error('Error storing user credentials:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Whether user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const credentials = await getUserCredentials()
  return !!credentials
}

/**
 * Store master password in local database
 * @param {string} password - Master password
 * @param {string} [hint] - Optional password hint
 * @returns {Promise<ServiceResponse>} Operation result
 */
export async function storeMasterPassword(
  password: string,
  hint?: string
): Promise<ServiceResponse> {
  try {
    if (!password || password.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long'
      }
    }

    await localUserDB.put({
      _id: DocType.MASTER_PASSWORD,
      // TODO: Hash master password
      password,
      hint,
      createdAt: new Date().toISOString()
    })

    return {success: true}
  } catch (error) {
    console.error('Error storing master password:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Verify master password against stored value
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} Whether password is correct
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  try {
    const doc = await localUserDB.get(DocType.MASTER_PASSWORD)
    // TODO: Maybe it'll require to rewrite this comparision
    return doc.password === password
  } catch (error) {
    console.error('Error verifying master password:', error)
    return false
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Create a new user account on the backend
 * @param {string} email - User email
 * @returns {Promise<ServiceResponse>} Account creation result
 */
export async function createUserAccount(
  email: string
): Promise<ServiceResponse> {
  try {
    if (!isValidEmail(email)) {
      return {success: false, message: 'Invalid email address'}
    }

    // TODO: Actually store email and create non-anonumous user
    return {
      success: true,
      message: 'Account created successfully'
    }
  } catch (error) {
    console.error('Error creating user account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
