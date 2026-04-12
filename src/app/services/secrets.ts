import {uuidv7} from 'uuidv7'
import type {Secret, ServiceResponse} from '../../types.ts'
import {decryptField, encryptField, getEncryptionKey} from './encryption.ts'
import {localSecretsDB} from './pouchDB.ts'
import {wrap} from './result.ts'
import {validateSecret} from './validation.ts'

async function requireEncryptionKey(): Promise<CryptoKey> {
  const key = await getEncryptionKey()
  if (!key) throw new Error('Encryption key not available')
  return key
}

/**
 * Create a new secret
 * @param {Secret} secret - Secret to store
 * @returns {Promise<ServiceResponse>} Operation result
 */
export function createSecret(secret: Secret): Promise<ServiceResponse> {
  return wrap('creating secret', async () => {
    if (!validateSecret(secret)) {
      throw new Error(
        'Invalid secret data. Name, username and password are required.'
      )
    }
    const encryptionKey = await requireEncryptionKey()
    return localSecretsDB.put({
      ...secret,
      _id: uuidv7(),
      createdAt: new Date().toISOString(),
      password: await encryptField(secret.password, encryptionKey)
    })
  })
}

/**
 * Delete a secret
 * @param {string} id - Secret document ID
 * @returns {Promise<ServiceResponse>} Operation result
 */
export function deleteSecret(id: string): Promise<ServiceResponse> {
  return wrap('deleting secret', async () =>
    localSecretsDB.remove(await localSecretsDB.get(id))
  )
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
export function getAllSecrets(): Promise<ServiceResponse<Secret[]>> {
  return wrap('fetching secrets', async () => {
    const encryptionKey = await requireEncryptionKey()
    const {rows} = await localSecretsDB.allDocs({
      include_docs: true,
      descending: true
    })

    const decrypted: (Secret | null)[] = await Promise.all(
      rows.map(async ({doc}) => {
        if (!doc || !doc.password) return null
        try {
          const secret: Secret = {
            _id: doc._id,
            name: doc.name,
            username: doc.username,
            password: await decryptField(doc.password, encryptionKey),
            notes: doc.notes,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
          }
          return secret
        } catch (error) {
          console.error('Error decrypting secret:', error)
          return null
        }
      })
    )

    return decrypted.filter((s): s is Secret => s !== null)
  })
}

/**
 * Get a single secret by ID
 * @param {string} id - Secret document ID
 * @returns {Promise<ServiceResponse<Secret>>} Requested secret
 */
export function getSecret(id: string): Promise<ServiceResponse<Secret>> {
  return wrap('fetching secret', async () => {
    const encryptionKey = await requireEncryptionKey()
    const secret = await localSecretsDB.get(id)
    return {
      _id: secret._id,
      name: secret.name,
      username: secret.username,
      password: await decryptField(secret.password, encryptionKey),
      notes: secret.notes,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt
    }
  })
}

/**
 * Update an existing secret
 * @param {string} id - Secret document ID
 * @param {Partial<Secret>} updates - Fields to update
 * @returns {Promise<ServiceResponse>} Operation result
 */
export function updateSecret(
  id: string,
  updates: Partial<Secret>
): Promise<ServiceResponse> {
  return wrap('updating secret', async () => {
    const current = await localSecretsDB.get(id)
    const passwordChanged =
      updates.password !== undefined && updates.password !== current.password
    const nextPassword = passwordChanged
      ? await encryptField(
          updates.password as string,
          await requireEncryptionKey()
        )
      : current.password

    return localSecretsDB.put({
      ...current,
      ...updates,
      password: nextPassword,
      updatedAt: new Date().toISOString()
    })
  })
}
