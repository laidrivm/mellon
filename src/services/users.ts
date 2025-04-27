import {localUserDB} from '../services/pouchDB.ts'
import {DocType, UserCredentials, ServiceResponse} from '../types.ts'
import {
  encryptField,
  decryptField,
  getEncryptionKey
} from '../services/encryption.ts'
import {MasterPassword} from '../types.ts'

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
      email: doc.email,
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
      _id: `${DocType.USER_CREDENTIALS}`,
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
  masterPassword: MasterPassword
): Promise<ServiceResponse> {
  const password = masterPassword.password
  const hint = masterPassword.hint || 'Hint has never been set'
  try {
    const encryptionKey = await getEncryptionKey()
    const encryptedPassword = await encryptField(password, encryptionKey)

    const result = await localUserDB.put({
      _id: `${DocType.MASTER_PASSWORD}`,
      password: encryptedPassword,
      hint,
      createdAt: new Date().toISOString()
    })

    return {success: true, data: result}
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
    const doc = await localUserDB.get(`${DocType.MASTER_PASSWORD}`)
    const encryptionKey = await getEncryptionKey()
    const decryptedPassword = await decryptField(doc.password, encryptionKey)

    return decryptedPassword === password
  } catch (error) {
    console.error('Error verifying master password:', error)
    return false
  }
}

/**
 * Check if master password is stored in the database
 * @returns {Promise<boolean>} Return true when set
 */
export async function hasMasterPassword(): Promise<boolean> {
  try {
    const doc = await localUserDB.get(`${DocType.MASTER_PASSWORD}`)

    return {
      success: doc.password ? true : false
    }
  } catch (error) {
    console.error('Error getting master password:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Get master password hint from the database
 * @returns {Promise<string>} Return hint for master password
 */
export async function getMasterPasswordHint(): Promise<string> {
  try {
    const doc = await localUserDB.get(`${DocType.MASTER_PASSWORD}`)

    return {
      success: true,
      data: {hint: doc.hint}
    }
  } catch (error) {
    console.error('Error getting master password:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
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

    const currentCreds = await localUserDB.get(DocType.USER_CREDENTIALS)

    const updatedCreds = {
      ...currentCreds,
      email,
      updatedAt: new Date().toISOString()
    }

    const result = await localUserDB.put(updatedCreds)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error creating user account:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function getEmail(): Promise<ServiceResponse> {
  try {
    const doc = await localUserDB.get(DocType.USER_CREDENTIALS)

    return {
      success: true,
      data: {email: doc.email}
    }
  } catch (error) {
    console.error('Error getting email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
