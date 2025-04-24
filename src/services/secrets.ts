import {localSecretsDB, generateDocId} from '../services/pouchDB.ts'
import {
  encryptField,
  decryptField,
  getEncryptionKey
} from '../services/encryption.ts'
import {DocType, Secret, ServiceResponse} from '../types.ts'

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
    secret.username.trim().length > 0 &&
    typeof secret.password === 'string' &&
    secret.password.length > 0
  )
}

function validateId(id: Secret): boolean {
  return !!id && typeof id === 'string' && id.trim().length > 0
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
        message:
          'Invalid secret data. Name, username and password are required.'
      }
    }

    const encryptionKey = await getEncryptionKey()

    // Prepare document
    const newSecret: Secret = {
      ...secret,
      _id: generateDocId(DocType.SECRET),
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
 * Retrieve all secrets
 * @returns {Promise<ServiceResponse<Secret[]>>} All secrets
 */
export async function getAllSecrets(): Promise<ServiceResponse<Secret[]>> {
  try {
    const encryptionKey = await getEncryptionKey()

    const result = await localSecretsDB.allDocs({
      include_docs: true,
      descending: true,
      startkey: `${DocType.SECRET}:\uffff`,
      endkey: `${DocType.SECRET}:`
    })

    const secrets: Secret[] = []

    for (const row of result.rows) {
      try {
        const decryptedSecret = {...row.doc}
        decryptedSecret.password = await decryptField(
          decryptedSecret.password,
          encryptionKey
        )
        secrets.push(decryptedSecret)
      } catch (decryptError) {
        console.error('Error decrypting secret:', decryptError)
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
    if (!validateId(id)) {
      return {
        success: false,
        message: 'Invalid secret ID'
      }
    }

    const encryptionKey = await getEncryptionKey()
    const secret = await localSecretsDB.get(id)

    const decryptedSecret = {
      ...secret,
      password: await decryptField(secret.password, encryptionKey)
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
    if (!validateId(id)) {
      return {
        success: false,
        message: 'Invalid secret ID'
      }
    }

    const current = await localSecretsDB.get(id)

    const updatedSecret = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    if (updates.password && updates.password !== current.password) {
      const encryptionKey = await getEncryptionKey()
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

/**
 * Delete a secret
 * @param {string} id - Secret document ID
 * @returns {Promise<ServiceResponse>} Operation result
 */
export async function deleteSecret(id: string): Promise<ServiceResponse> {
  try {
    if (!validateId(id)) {
      return {
        success: false,
        message: 'Invalid secret ID'
      }
    }

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
