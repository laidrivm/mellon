import {localUserDB} from './pouchDB.ts'
import {DocType, EncryptionKeyDocument} from '../types.ts'
import {recryptSecrets} from './secrets.ts'

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
 * Derive encryption key from master password using PBKDF2
 * @param {string} masterPassword - Master password
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} Derived encryption key
 */
export async function deriveKeyFromPassword(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(masterPassword)

  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Derive AES key from password
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  )
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

/**
 * Retrieve and decrypt encryption key from database using master password
 * @param {string} masterPassword - Master password for decryption
 * @param {string} date - Date string used for salt generation
 * @returns {Promise<CryptoKey | null>} Decrypted encryption key or null if failed
 */
export async function getAndDecryptKeyFromDB(
  masterPassword: string,
  date: string
): Promise<CryptoKey | null> {
  try {
    const keyDoc = (await localUserDB.get(
      `${DocType.ENCRYPTION_KEY}`
    )) as EncryptionKeyDocument

    if (!keyDoc || !keyDoc.encryptedKey) {
      return null
    }

    // Generate salt from date
    const salt = await dateToSalt(date, date.length)

    // Derive key from master password
    const keyFromMP = await deriveKeyFromPassword(masterPassword, salt)

    // Decrypt the stored encryption key
    const decryptedKeyData = await decryptField(keyDoc.encryptedKey, keyFromMP)

    // Import the decrypted key
    return await window.crypto.subtle.importKey(
      'jwk',
      JSON.parse(decryptedKeyData),
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt']
    )
  } catch (error) {
    console.error('Error retrieving and decrypting encryption key:', error)
    return null
  }
}

/**
 * Retrieve an initially unencrypted key from database
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
 * Store encrypted encryption key in database
 * @param {CryptoKey} key - Encryption key to encrypt and store
 * @param {CryptoKey} encryptionKey - Key to encrypt the main key with
 * @returns {Promise<PouchDB.Core.Response>} Storage operation result
 */
async function storeEncryptedKeyInDB(
  key: CryptoKey,
  encryptionKey: CryptoKey
): Promise<PouchDB.Core.Response> {
  try {
    const keyDoc = (await localUserDB.get(
      `${DocType.ENCRYPTION_KEY}`
    )) as EncryptionKeyDocument

    // Export the key to encrypt it
    const keyData = await window.crypto.subtle.exportKey('jwk', key)

    // Encrypt the exported key
    const encryptedKeyData = await encryptField(
      JSON.stringify(keyData),
      encryptionKey
    )

    const updatedDoc = {
      ...keyDoc,
      encryptedKey: encryptedKeyData,
      updatedAt: new Date().toISOString()
    }

    return await localUserDB.put(updatedDoc)
  } catch (error) {
    console.error('Failed to store encrypted encryption key:', error)
    throw error
  }
}

/**
 * Store raw encryption key in database
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
 * Convert ISO date string to Uint8Array salt for cryptographic use
 * @param {string} isoDateString - ISO date string (e.g., "2024-12-11T10:30:45.123Z")
 * @param {number} saltLength - Desired salt length in bytes (default: 16)
 * @returns {Promise<Uint8Array>} Cryptographic salt derived from date
 */
export async function dateToSalt(
  isoDateString: string,
  saltLength = 16
): Promise<Uint8Array> {
  // Convert ISO string to UTF-8 bytes
  const encoder = new TextEncoder()
  const dateBytes = encoder.encode(isoDateString)

  // Use SHA-256 to hash the date string for better distribution
  const hashBuffer = await crypto.subtle.digest('SHA-256', dateBytes)
  const hashArray = new Uint8Array(hashBuffer)

  // If requested salt length is longer than hash, repeat the hash
  if (saltLength <= hashArray.length) {
    return hashArray.slice(0, saltLength)
  } else {
    // For longer salts, concatenate multiple hashes
    const extendedSalt = new Uint8Array(saltLength)
    let offset = 0

    while (offset < saltLength) {
      const remainingBytes = saltLength - offset
      const bytesToCopy = Math.min(hashArray.length, remainingBytes)
      extendedSalt.set(hashArray.slice(0, bytesToCopy), offset)
      offset += bytesToCopy
    }

    return extendedSalt
  }
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
  console.log(`data in encryptField: ${data}`)
  const dataBuffer = encoder.encode(JSON.stringify(data))
  //const dataBuffer = encoder.encode(data)

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
 * Initialize encryption system with master password
 * @param {string} masterPassword - Master password
 * @param {string} date - Date string for salt generation
 * @returns {Promise<boolean>} Success status
 */
export async function updateEncryptionWithMP(
  masterPassword: string,
  date: string
): Promise<boolean> {
  try {
    // 1. Create new encryption key, as the old one was stored open on the local device and might be compromised
    const newEncryptionKey = await generateNewKey()
    console.log(`newEncryptionKey: ${newEncryptionKey}`)
    // 2. Cache the decrypted values in memory
    cachedEncryptionKey = newEncryptionKey
    cachedMasterPassword = masterPassword
    console.log(
      `cachedEncryptionKey: ${cachedEncryptionKey}, cachedMasterPassword: ${cachedMasterPassword}`
    )
    // 3. Retrieve old encryption key to run recryption
    const oldEncryptionKey = await getKeyFromDB()
    console.log(`oldEncryptionKey: ${oldEncryptionKey}`)
    // 4. Recrypt all the existing secrets with the new key
    await recryptSecrets(oldEncryptionKey, newEncryptionKey)
    console.log(`Secrets recrypted`)
    // 5. Generate salt from date and derive key from master password
    const salt = await dateToSalt(date, date.length)
    console.log(`salt: ${salt}`)
    const keyFromMP = await deriveKeyFromPassword(masterPassword, salt)
    console.log(`keyFromMP: ${keyFromMP}`)
    // 6. Store the new encryption key encrypted with the master password-derived key
    const result = await storeEncryptedKeyInDB(newEncryptionKey, keyFromMP)
    console.log(`storeEncryptedKeyInDB result: ${result}`)
    return true
  } catch (error) {
    console.error('Error initializing encryption:', error)
    return false
  }
}

/**
 * Unlock encryption system with master password
 * @param {string} masterPassword - Master password
 * @param {string} date - Date string for salt generation
 * @returns {Promise<boolean>} Success status
 */
export async function unlockEncryption(
  masterPassword: string,
  date: string
): Promise<boolean> {
  try {
    // Try to decrypt the stored encryption key with the master password
    const decryptedKey = await getAndDecryptKeyFromDB(masterPassword, date)

    if (!decryptedKey) {
      console.log(
        'Failed to decrypt encryption key - wrong password or no key found'
      )
      return false
    }

    // Cache the decrypted values in memory
    cachedEncryptionKey = decryptedKey
    cachedMasterPassword = masterPassword

    console.log('Encryption system unlocked successfully')
    return true
  } catch (error) {
    console.error('Error unlocking encryption:', error)
    return false
  }
}

/**
 * Check if encryption system is initialized (unlocked)
 * @returns {boolean} Whether encryption is available
 */
export function isEncryptionInitialized(): boolean {
  return cachedEncryptionKey !== null && cachedMasterPassword !== null
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
