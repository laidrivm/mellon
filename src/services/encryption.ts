import {localUserDB} from './pouchDB.ts'
import {DocType, EncryptionKeyDocument} from '../types.ts'

// In-memory storage for decrypted keys (cleared on lock)
let cachedEncryptionKey: CryptoKey | null = null
let cachedMasterPassword: string | null = null

/**
 * Get encryption key from memory (must be unlocked first)
 * @returns {Promise<CryptoKey>} Encryption key
 * @throws {Error} If app is locked or key not available
 */
export async function getCachedEncryptionKey(): Promise<CryptoKey> {
  if (!cachedEncryptionKey) {
    throw new Error('Application is locked. Please unlock first.')
  }
  return cachedEncryptionKey
}

/**
 * Get master password from memory (must be unlocked first)
 * @returns {string} Master password
 * @throws {Error} If app is locked or password not available
 */
export function getCachedMasterPassword(): string {
  if (!cachedMasterPassword) {
    throw new Error('Application is locked. Please unlock first.')
  }
  return cachedMasterPassword
}

/**
 * Clear all cached encryption data from memory. Called on lock
 */
export function clearEncryptionCache(): void {
  cachedEncryptionKey = null
  cachedMasterPassword = null
  console.log('Encryption cache cleared')
}

/**
 * Retrieve encryption key from database
 * @returns {Promise<CryptoKey | null>} Encryption key or null if not found
 */
async function getKeyFromDB(): Promise<CryptoKey | null> {
  try {
    const keyDoc = (await localUserDB.get(
      `${DocType.ENCRYPTION_KEY}`
    )) as EncryptionKeyDocument

    if (keyDoc && keyDoc.key) {
      return await window.crypto.subtle.importKey(
        'jwk',
        keyDoc.key,
        {name: 'AES-GCM', length: 256},
        false,
        ['encrypt', 'decrypt']
      )
    }
    return null
  } catch (error) {
    if (error.name === 'not_found') {
      return null
    }
    console.error('Error retrieving encryption key:', error)
    throw error
  }
}

/**
 * Generate a new encryption key
 * @returns {Promise<CryptoKey>} Generated encryption key
 */
async function generateNewKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Store encryption key in database
 * @param {CryptoKey} key - Encryption key to store
 * @returns {Promise<PouchDB.Core.Response>} Storage operation result
 */
async function storeKeyInDB(key: CryptoKey): Promise<PouchDB.Core.Response> {
  try {
    const keyData = await window.crypto.subtle.exportKey('jwk', key)

    const keyDoc: EncryptionKeyDocument = {
      _id: DocType.ENCRYPTION_KEY,
      key: keyData,
      createdAt: new Date().toISOString(),
      type: 'encryptionKey'
    }

    return await localUserDB.put(keyDoc)
  } catch (error) {
    console.error('Failed to store encryption key:', error)
    throw error
  }
}

/**
 * Get or create encryption key
 * @returns {Promise<CryptoKey>} Encryption key
 */
export async function getEncryptionKey(): Promise<CryptoKey> {
  const key = await getKeyFromDB()
  if (key) return key

  const newKey = await generateNewKey()
  await storeKeyInDB(newKey)
  return newKey
}

/**
 * Encrypt single field using AES-GCM
 * @param {string} data - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<string>} Encrypted data as base64 string
 */
export async function encryptField(
  data: string,
  key: CryptoKey
): Promise<string> {
  // Create a random initialization vector
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  // Convert data to ArrayBuffer
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(JSON.stringify(data))

  // Encrypt the data
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  )

  // Combine the IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encryptedBuffer), iv.length)

  // Convert to Base64 string for storage
  return btoa(String.fromCharCode.apply(null, Array.from(combined)))
}

/**
 * Decrypt single field using AES-GCM
 * @param {string} ciphertext - Encrypted data as base64 string
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<sting>} Decrypted data
 */
export async function decryptField(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  try {
    // Convert from Base64 string
    const binary = atob(ciphertext)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    // Extract IV (first 12 bytes) and ciphertext
    const iv = bytes.slice(0, 12)
    const encryptedData = bytes.slice(12)

    // Decrypt the data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    )

    // Convert ArrayBuffer to string and parse JSON
    const decoder = new TextDecoder()
    const decryptedString = decoder.decode(decryptedBuffer)
    return JSON.parse(decryptedString)
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}
