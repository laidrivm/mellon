import {uuidv7} from 'uuidv7'
import {
  decryptField,
  encryptField,
  getEncryptionKey
} from '../services/encryption.ts'
import {localSecretsDB} from '../services/pouchDB.ts'
import type {Secret, ServiceResponse} from '../types.ts'

/**
 * Validate secret data
 * @param {Secret} secret - Secret to validate
 * @returns {boolean} Whether secret is valid
 */
function validateSecret(secret: Secret): boolean {
  return (
    !!secret &&
    typeof secret.name === 'string' &&
    secret.name.trim().length > 0 &&
    typeof secret.username === 'string' &&
    typeof secret.password === 'string' &&
    secret.password.length > 0
  )
}

/**
 * Create a new secret
 * @param {Secret} secret - Secret to store
 * @returns {Promise<ServiceResponse>} Operation result
 */
export async function createSecret(secret: Secret): Promise<ServiceResponse> {
  try {
    if (!validateSecret(secret)) {
      return {
        success: false,
        error: 'Invalid secret data. Name, username and password are required.'
      }
    }

    const encryptionKey = await getEncryptionKey()
    if (!encryptionKey) {
      return {
        success: false,
        error: 'Encryption key not available'
      }
    }

    const newSecret: Secret = {
      ...secret,
      _id: uuidv7(),
      createdAt: new Date().toISOString()
    }

    newSecret.password = await encryptField(newSecret.password, encryptionKey)

    const result = await localSecretsDB.put(newSecret)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error creating secret:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Delete a secret
 * @param {string} id - Secret document ID
 * @returns {Promise<ServiceResponse>} Operation result
 */
export async function deleteSecret(id: string): Promise<ServiceResponse> {
  try {
    const secret = await localSecretsDB.get(id)

    const result = await localSecretsDB.remove(secret)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error deleting secret:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Recrypt all secrets from old encryption key to new encryption key
 * @param {CryptoKey | null} oldEncryptionKey - Previous encryption key (null for first-time setup)
 * @param {CryptoKey} newEncryptionKey - New encryption key to use
 * @returns {Promise<{success: boolean, processed: number, errors: number}>} Recryption result
 */
export async function recryptSecrets(
  newEncryptionKey: CryptoKey
): Promise<boolean> {
  let success = true
  const secrets = await getAllSecrets()
  if (!secrets.data) {
    return true // No secrets to recrypt
  }
  const recryptPromises = secrets.data.map(async (secret) => {
    try {
      if (!secret._id) return

      // Get the current document to obtain _rev for update
      const currentDoc = await localSecretsDB.get(secret._id)

      const newEncryptedPassword = await encryptField(
        secret.password,
        newEncryptionKey
      )

      const updatedSecret = {
        ...currentDoc,
        password: newEncryptedPassword,
        updatedAt: new Date().toISOString()
      }

      await localSecretsDB.put(updatedSecret)
    } catch (error) {
      console.error(`Error processing secret ${secret._id}:`, error)
      success = false
    }
  })

  await Promise.all(recryptPromises)

  return success
}

// ---------------------------------------------------------------------------------------------------
// refactoring line ----------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

/**
 * TODO: Split operations in two: first — get the list of all secrets, second — get exact secret data
 * when acually needed — not to decrypt and store in memory everything at once
 * Retrieve all secrets
 * @returns {Promise<ServiceResponse<Secret[]>>} All secrets
 */
export async function getAllSecrets(): Promise<ServiceResponse<Secret[]>> {
  try {
    const encryptionKey = await getEncryptionKey()
    if (!encryptionKey) {
      return {
        success: false,
        error: 'Encryption key not available'
      }
    }

    const result = await localSecretsDB.allDocs({
      include_docs: true,
      descending: true
    })

    const secrets: Secret[] = []

    for (const row of result.rows) {
      try {
        const doc = row.doc
        if (!doc || !doc.password) continue

        const decryptedSecret: Secret = {
          _id: doc._id,
          name: doc.name,
          username: doc.username,
          password: await decryptField(doc.password, encryptionKey),
          notes: doc.notes,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }
        secrets.push(decryptedSecret)
      } catch (error) {
        console.error('Error decrypting secret:', error)
      }
    }

    return {
      success: true,
      data: secrets
    }
  } catch (error) {
    console.error('Error fetching secrets:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Get a single secret by ID
 * @param {string} id - Secret document ID
 * @returns {Promise<ServiceResponse<Secret>>} Requested secret
 */
export async function getSecret(id: string): Promise<ServiceResponse<Secret>> {
  try {
    const encryptionKey = await getEncryptionKey()
    if (!encryptionKey) {
      return {
        success: false,
        error: 'Encryption key not available'
      }
    }
    const secret = await localSecretsDB.get(id)

    const decryptedSecret: Secret = {
      _id: secret._id,
      name: secret.name,
      username: secret.username,
      password: await decryptField(secret.password, encryptionKey),
      notes: secret.notes,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt
    }

    return {
      success: true,
      data: decryptedSecret
    }
  } catch (error) {
    console.error('Error fetching secret:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Update an existing secret
 * @param {string} id - Secret document ID
 * @param {Partial<Secret>} updates - Fields to update
 * @returns {Promise<ServiceResponse>} Operation result
 */
export async function updateSecret(
  id: string,
  updates: Partial<Secret>
): Promise<ServiceResponse> {
  try {
    const current = await localSecretsDB.get(id)

    const updatedSecret = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    if (updates.password && updates.password !== current.password) {
      const encryptionKey = await getEncryptionKey()
      if (!encryptionKey) {
        return {
          success: false,
          error: 'Encryption key not available'
        }
      }
      updatedSecret.password = await encryptField(
        updates.password,
        encryptionKey
      )
    }

    const result = await localSecretsDB.put(updatedSecret)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error updating secret:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
