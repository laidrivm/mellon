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
    typeof secret.password === 'string' &&
    secret.password.length > 0
  )
}

function validateId(id: string): boolean {
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
        error: 'Invalid secret data. Name, username and password are required.'
      }
    }

    const encryptionKey = await getEncryptionKey()

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

/**
 * Recrypt all secrets from old encryption key to new encryption key
 * @param {CryptoKey | null} oldEncryptionKey - Previous encryption key (null for first-time setup)
 * @param {CryptoKey} newEncryptionKey - New encryption key to use
 * @returns {Promise<{success: boolean, processed: number, errors: number}>} Recryption result
 */
export async function recryptSecrets(
  oldEncryptionKey: CryptoKey | null,
  newEncryptionKey: CryptoKey
): Promise<{success: boolean; processed: number; errors: number}> {
  console.log(`🔄 Starting recryption process...`)

  let processed = 0
  let errors = 0

  try {
    // If no old key, there's nothing to recrypt (first-time setup)
    if (!oldEncryptionKey) {
      console.log(
        'ℹ️ No old encryption key - skipping recryption (first-time setup)'
      )
      return {success: true, processed: 0, errors: 0}
    }

    // Get all secret documents from the database
    const result = await localSecretsDB.allDocs({
      include_docs: true,
      startkey: `${DocType.SECRET}:`,
      endkey: `${DocType.SECRET}:\uffff`
    })

    console.log(`📋 Found ${result.rows.length} secrets to recrypt`)

    if (result.rows.length === 0) {
      console.log('ℹ️ No secrets found - recryption complete')
      return {success: true, processed: 0, errors: 0}
    }

    // Process each secret
    const recryptPromises = result.rows.map(async (row) => {
      try {
        const secret = row.doc

        if (!secret || !secret._id || !secret.password) {
          console.warn(
            `⚠️ Skipping invalid secret: ${secret?._id || 'unknown'}`
          )
          errors++
          return
        }

        console.log(`🔓 Recrypting secret: ${secret._id}`)

        // Step 1: Decrypt password with old key
        let decryptedPassword: string
        try {
          decryptedPassword = await decryptField(
            secret.password,
            oldEncryptionKey
          )
          console.log(`✅ Decrypted with old key: ${secret._id}`)
        } catch (decryptError) {
          console.error(
            `❌ Failed to decrypt secret ${secret._id} with old key:`,
            decryptError
          )
          errors++
          return
        }

        // Step 2: Encrypt password with new key
        let newEncryptedPassword: string
        try {
          newEncryptedPassword = await encryptField(
            decryptedPassword,
            newEncryptionKey
          )
          console.log(`🔒 Encrypted with new key: ${secret._id}`)
        } catch (encryptError) {
          console.error(
            `❌ Failed to encrypt secret ${secret._id} with new key:`,
            encryptError
          )
          errors++
          return
        }

        // Step 3: Update the document in database
        const updatedSecret = {
          ...secret,
          password: newEncryptedPassword,
          updatedAt: new Date().toISOString()
        }

        try {
          await localSecretsDB.put(updatedSecret)
          console.log(`💾 Updated secret in database: ${secret._id}`)
          processed++
        } catch (updateError) {
          console.error(
            `❌ Failed to update secret ${secret._id} in database:`,
            updateError
          )
          errors++
          return
        }
      } catch (error) {
        console.error(`❌ Unexpected error processing secret ${row.id}:`, error)
        errors++
      }
    })

    // Wait for all recryption operations to complete
    await Promise.all(recryptPromises)

    const success = errors === 0
    console.log(
      `🎯 Recryption complete: ${processed} processed, ${errors} errors`
    )

    if (success) {
      console.log('✅ All secrets successfully recrypted!')
    } else {
      console.warn(`⚠️ Recryption completed with ${errors} errors`)
    }

    return {success, processed, errors}
  } catch (error) {
    console.error('💥 Fatal error during recryption process:', error)
    return {success: false, processed, errors: errors + 1}
  }
}

/**
 * Verify recryption by testing decryption with new key
 * @param {CryptoKey} newEncryptionKey - New encryption key to test
 * @returns {Promise<{success: boolean, tested: number, failures: number}>} Verification result
 */
export async function verifyRecryption(
  newEncryptionKey: CryptoKey
): Promise<{success: boolean; tested: number; failures: number}> {
  console.log('🔍 Verifying recryption...')

  let tested = 0
  let failures = 0

  try {
    // Get all secrets
    const result = await localSecretsDB.allDocs({
      include_docs: true,
      startkey: `${DocType.SECRET}:`,
      endkey: `${DocType.SECRET}:\uffff`
    })

    console.log(`🧪 Testing ${result.rows.length} secrets with new key`)

    // Test each secret can be decrypted with new key
    for (const row of result.rows) {
      const secret = row.doc

      if (!secret || !secret._id || !secret.password) {
        continue
      }

      try {
        await decryptField(secret.password, newEncryptionKey)
        console.log(`✅ Verification passed: ${secret._id}`)
        tested++
      } catch (error) {
        console.error(`❌ Verification failed: ${secret._id}`, error)
        failures++
      }
    }

    const success = failures === 0
    console.log(
      `🎯 Verification complete: ${tested} tested, ${failures} failures`
    )

    return {success, tested, failures}
  } catch (error) {
    console.error('💥 Error during verification:', error)
    return {success: false, tested, failures: failures + 1}
  }
}
