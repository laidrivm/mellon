import {
  DocType,
  type LocalUserDoc,
  type MasterPassword,
  type ServiceResponse
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
import {setCachedKey} from './session.ts'

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
    // generateRecoveryShares writes encryptedKeyByRecovery to the same doc,
    // so re-fetch to get the current rev before our update.
    const freshDoc = await localUserDB.get(DocType.LOCAL_USER)
    await localUserDB.put({
      ...freshDoc,
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
    const doc = await localUserDB.get(DocType.LOCAL_USER)
    if (!doc.createdAt) return false

    const result = await reconstructMasterKey(mnemonicShares, doc.createdAt)
    if (!result.success || !result.data) return false

    setCachedKey(result.data)
    return true
  } catch (error) {
    console.error('Error verifying recovered master password:', error)
    return false
  }
}
