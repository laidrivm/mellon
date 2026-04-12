import {
  DocType,
  type LocalUserDoc,
  type MasterPassword,
  type OnboardingStage,
  type ServiceResponse,
  type UserCredentials
} from '../../types.ts'
import {
  decryptField,
  encryptField,
  generateRecoveryShares,
  getAndDecryptKeyFromDB,
  getEncryptionKey,
  reconstructMasterKey,
  updateEncryptionWithMP
} from './encryption.ts'
import {localUserDB} from './pouchDB.ts'
import {wrap} from './result.ts'

export async function existsLocalUser(): Promise<boolean> {
  try {
    await localUserDB.get(DocType.LOCAL_USER)
    return true
  } catch (error) {
    if (error instanceof Error && error.name !== 'not_found')
      console.error('Error getting the onboarding stage:', error)
    return false
  }
}

export function createLocalUser(): Promise<ServiceResponse> {
  return wrap('creating a local user', () =>
    localUserDB.put({
      _id: DocType.LOCAL_USER,
      onboarding: 'secret',
      createdAt: new Date().toISOString()
    })
  )
}

export async function getOnboardingStage(): Promise<OnboardingStage | null> {
  try {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)
    return userDoc.onboarding ?? null
  } catch (error) {
    console.error('Error getting the onboarding stage:', error)
    return null
  }
}

export function updateOnboardingStage(
  stage: OnboardingStage
): Promise<ServiceResponse> {
  return wrap('updating the onboarding stage', async () => {
    const localUserDoc = await localUserDB.get(DocType.LOCAL_USER)
    return localUserDB.put({
      ...localUserDoc,
      onboarding: stage,
      updatedAt: new Date().toISOString()
    })
  })
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
    if (!encryptionKey) {
      return {
        success: false,
        error: 'Encryption key not available'
      }
    }
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
    // Retrieve Master Password and the creation date from the DB
    const doc = await localUserDB.get(DocType.LOCAL_USER)
    const encryptedMP = doc.password
    const createdAt = doc.createdAt
    if (!encryptedMP || !createdAt) {
      return false
    }
    // Apply this key to decrypt the encryption key
    const encryptionKey = await getAndDecryptKeyFromDB(password, createdAt)

    if (!encryptionKey) {
      return false
    }

    // Use the result to decrypt the stored master-password
    const decryptedPassword = await decryptField(encryptedMP, encryptionKey)

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
export function getMasterPasswordHint(): Promise<
  ServiceResponse<{hint: string}>
> {
  return wrap('getting master password hint', async () => {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)
    return {hint: userDoc.hint ?? 'No hint available'}
  })
}

/**
 * Get recovery words. Generates and persists an encrypted blob on first call;
 * subsequent calls decrypt and return the same list. The blob is cleared once
 * the user advances past the recovery onboarding stage.
 * @returns {Promise<ServiceResponse<string[]>>} Recovery shares
 */
export async function getRecoveryShares(): Promise<ServiceResponse<string[]>> {
  try {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)

    if (!userDoc.createdAt) {
      return {success: false, error: 'User creation date not found'}
    }

    const encryptionKey = await getEncryptionKey()
    if (!encryptionKey) {
      return {success: false, error: 'Encryption key not available'}
    }

    if (userDoc.recoveryShares) {
      const decrypted = await decryptField(
        userDoc.recoveryShares,
        encryptionKey
      )
      return {success: true, data: JSON.parse(decrypted) as string[]}
    }

    const recoveryResult = await generateRecoveryShares(userDoc.createdAt)
    if (!recoveryResult.success || !recoveryResult.data) {
      return recoveryResult
    }

    const encryptedShares = await encryptField(
      JSON.stringify(recoveryResult.data),
      encryptionKey
    )
    await localUserDB.put({
      ...userDoc,
      recoveryShares: encryptedShares,
      updatedAt: new Date().toISOString()
    })

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
 * Remove stored recovery shares blob from local DB.
 * Called once the user confirms they have backed up the words.
 */
export function clearRecoveryShares(): Promise<ServiceResponse> {
  return wrap('clearing recovery shares', async () => {
    const doc = await localUserDB.get(DocType.LOCAL_USER)
    if (!doc.recoveryShares) return doc
    const next: LocalUserDoc = {...doc, updatedAt: new Date().toISOString()}
    delete next.recoveryShares
    return localUserDB.put(next)
  })
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
    // Reconstruct the master password from shares
    const reconstructResult = await reconstructMasterKey(mnemonicShares)

    if (!reconstructResult.success) {
      console.log('Failed to reconstruct master password from shares')
      return false
    }

    if (!reconstructResult.data) {
      console.log('No key data from reconstruction')
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
    return true
  } catch (error) {
    console.error('Error verifying recovered master password:', error)
    return false
  }
}

/**
 * Get email from user credentials
 * @returns {Promise<ServiceResponse<{email: string}>>} User email
 */
export async function getEmail(): Promise<
  ServiceResponse<{email: string | undefined}>
> {
  try {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)

    return {
      success: true,
      data: {email: userDoc.email}
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'not_found') {
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
export function storeEmail(email: string): Promise<ServiceResponse> {
  return wrap('storing email', async () => {
    if (!isValidEmail(email)) throw new Error('Invalid email address')
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)
    return localUserDB.put({
      ...userDoc,
      email,
      updatedAt: new Date().toISOString()
    })
  })
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
    const doc = (await localUserDB.get(
      DocType.USER_CREDENTIALS
    )) as LocalUserDoc & UserCredentials
    return {
      uuid: doc.uuid,
      password: doc.password,
      email: doc.email,
      dbName: doc.dbName,
      createdAt: doc.createdAt
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'not_found') {
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
export function createUserCredentials(
  uuid: string,
  password: string,
  dbName: string
): Promise<ServiceResponse> {
  return wrap('storing user credentials', async () => {
    if (!uuid || !password || !dbName) {
      throw new Error('Invalid credentials data')
    }
    await localUserDB.put({
      _id: DocType.USER_CREDENTIALS,
      uuid,
      password,
      dbName,
      createdAt: new Date().toISOString()
    })
    return {uuid, dbName}
  })
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Whether user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const credentials = await getUserCredentials()
  return !!credentials
}
