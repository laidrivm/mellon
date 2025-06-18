import {localUserDB} from './pouchDB.ts'
import {
  encryptField,
  decryptField,
  updateEncryptionWithMP,
  getEncryptionKey,
  getAndDecryptKeyFromDB,
  generateRecoveryShares,
  reconstructMasterKey
} from './encryption.ts'
import {
  DocType,
  OnboardingStage,
  MasterPassword,
  UserCredentials,
  ServiceResponse
} from '../types.ts'

export async function existsLocalUser(): Promise<boolean> {
  try {
    await localUserDB.get(DocType.LOCAL_USER)
    return true
  } catch (error) {
    if (error.name !== 'not_found')
      console.error('Error getting the onboarding stage:', error)
    return false
  }
}

export async function createLocalUser(): Promise<ServiceResponse> {
  try {
    const result = await localUserDB.put({
      _id: DocType.LOCAL_USER,
      onboarding: 'secret',
      createdAt: new Date().toISOString()
    })

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error creating a local user:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function getOnboardingStage(): Promise<OnboardingStage | null> {
  try {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)
    return userDoc.onboarding
  } catch (error) {
    console.error('Error getting the onboarding stage:', error)
    return null
  }
}

export async function updateOnboardingStage(
  stage: OnboardingStage
): Promise<ServiceResponse> {
  try {
    const localUserDoc = await localUserDB.get(DocType.LOCAL_USER)

    const updatedUserDoc = {
      ...localUserDoc,
      onboarding: stage,
      updatedAt: new Date().toISOString()
    }

    const result = await localUserDB.put(updatedUserDoc)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error updating the onboarding stage:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Store master password in local database (encrypted with encryption key)
 * @param {MasterPassword} masterPassword - an object with a password itself and a hint
 * @returns {Promise<ServiceResponse>} Operation result
 */
export async function storeMasterPassword(
  masterPassword: MasterPassword
): Promise<ServiceResponse> {
  const password = masterPassword.password
  const hint = masterPassword.hint || 'Hint has never been set'
  try {
    // Update the encryption system with the master password
    const success = await updateEncryptionWithMP(password)
    if (!success) {
      return {
        success: false,
        error: 'Failed to initialize encryption system'
      }
    }

    // Get the encryption key (now available in memory)
    const encryptionKey = await getEncryptionKey()
    // Encrypt the master password with the encryption key
    const encryptedPassword = await encryptField(password, encryptionKey)

    const doc = await localUserDB.get(DocType.LOCAL_USER)

    const result = await localUserDB.put({
      ...doc,
      password: encryptedPassword,
      hint
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
    console.log(`Entering verifyMasterPassword with ${password} candidate`)
    // Retrieve Master Password and the creation date from the DB
    const doc = await localUserDB.get(DocType.LOCAL_USER)
    console.log(`got from DB: ${JSON.stringify(doc)}`)
    const encryptedMP = doc.password
    console.log(`encryptedMP: ${encryptedMP}`)
    const createdAt = doc.createdAt
    console.log(`createdAt: ${createdAt}`)
    // Apply this key to decrypt the encryption key
    const encryptionKey = await getAndDecryptKeyFromDB(password, createdAt)

    if (!encryptionKey) {
      return false
    }

    // Use the result to decrypt the stored master-password
    const decryptedPassword = await decryptField(encryptedMP, encryptionKey)
    console.log(`decryptedPassword: ${decryptedPassword}`)

    return decryptedPassword === password
  } catch (error) {
    console.error('Error verifying master password:', error)
    return false
  }
}

/**
 * Get master password hint from the database
 * @returns {Promise<ServiceResponse<{hint: string}>>} Return hint for master password
 */
export async function getMasterPasswordHint(): Promise<
  ServiceResponse<{hint: string}>
> {
  try {
    const userDoc = await localUserDB.get(`${DocType.LOCAL_USER}`)

    return {
      success: true,
      data: {hint: userDoc.hint}
    }
  } catch (error) {
    console.error('Error getting master password hint:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Get recovery words
 * @returns {Promise<ServiceResponse<{shares: string[]}>>} Recovery shares
 */
export async function getRecoveryShares(): Promise<ServiceResponse<string[]>> {
  try {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)

    const recoveryResult = await generateRecoveryShares(userDoc.createdAt)

    if (!recoveryResult.success) {
      throw new Error('Failed to generate recovery shares')
    }

    return recoveryResult
  } catch (error) {
    console.error('Error getting recovery shares:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Verify master password reconstructed from recovery shares
 * @param {string[]} mnemonicShares - Recovery shares as mnemonic phrases
 * @returns {Promise<boolean>} Whether reconstructed password is correct
 */
export async function verifyRecoveredMasterPassword(
  mnemonicShares: string[]
): Promise<boolean> {
  try {
    console.log('Attempting to verify recovered master password')

    // Reconstruct the master password from shares
    const reconstructResult = await reconstructMasterKey(mnemonicShares)

    if (!reconstructResult.success) {
      console.log('Failed to reconstruct master password from shares')
      return false
    }

    const encryptionKey = await getAndDecryptKeyFromDB(reconstructResult.data)

    if (!encryptionKey) {
      console.log(
        'Failed to decrypt encryption key with reconstructed password'
      )
      return false
    }

    // If we successfully got the encryption key, the recovery was successful
    console.log('Successfully verified recovered master password')
    return true
  } catch (error) {
    console.error('Error verifying recovered master password:', error)
    return false
  }
}

// ---------------------------------------------------------------------------------------------------
// refactoring line ----------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

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

/**
 * Get email from user credentials
 * @returns {Promise<ServiceResponse<{email: string}>>} User email
 */
export async function getEmail(): Promise<ServiceResponse<{email: string}>> {
  try {
    const doc = await localUserDB.get(DocType.USER_CREDENTIALS)

    return {
      success: true,
      data: {email: doc.email}
    }
  } catch (error) {
    if (error.name === 'not_found') {
      return {
        success: false
      }
    }
    console.error('Error getting email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
