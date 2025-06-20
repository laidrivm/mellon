import {split, combine} from 'shamir-secret-sharing'

import {localUserDB} from './pouchDB.ts'
import {DocType} from '../types.ts'
import {recryptSecrets} from './secrets.ts'

import BIP39_WORDLIST from './englishMnemonics.json'

// In-memory storage for decrypted keys (cleared on lock)
let cachedEncryptionKey: CryptoKey | null = null
let cachedMasterPassword: string | null = null

/**
 * Retrieve an initially unencrypted key from database
 * @returns {Promise<CryptoKey | null>} Encryption key or null if not found
 */
async function getKeyFromDB(): Promise<CryptoKey | null> {
  try {
    const keyDoc = await localUserDB.get(DocType.LOCAL_USER)

    if (keyDoc?.key) {
      return await window.crypto.subtle.importKey(
        'jwk',
        keyDoc.key,
        {name: 'AES-GCM', length: 256},
        false, // not extractable
        ['encrypt', 'decrypt']
      )
    }

    if (keyDoc?.encryptedKey) {
      return keyDoc.encryptedKey
    }

    return null
  } catch (error) {
    if (error.name !== 'not_found') {
      console.error('Error retrieving encryption key:', error)
    }
    return null
  }
}

async function getLocalUserCreatedTime(): Promise<string | null> {
  try {
    const doc = await localUserDB.get(DocType.LOCAL_USER)
    return doc.createdAt
  } catch (error) {
    if (error.name !== 'not_found') {
      console.error('Error retrieving user creation time:', error)
    }
    return null
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
 * Store raw encryption key in database
 * @param {CryptoKey} key - Encryption key to store
 * @returns {Promise<PouchDB.Core.Response>} Storage operation result
 */
async function storeKeyInDB(key: CryptoKey): Promise<PouchDB.Core.Response> {
  const keyData = await window.crypto.subtle.exportKey('jwk', key)

  const doc = await localUserDB.get(DocType.LOCAL_USER)

  const keyDoc = {
    ...doc,
    key: keyData,
    updatedAt: new Date().toISOString()
  }

  return await localUserDB.put(keyDoc)
}

/**
 * Get or create encryption key
 * @returns {Promise<CryptoKey>} Encryption key
 */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  // If we have cached key, return it
  if (cachedEncryptionKey) {
    return cachedEncryptionKey
  }

  // Otherwise try to get from DB
  const key = await getKeyFromDB()
  if (key) {
    cachedEncryptionKey = key
    return key
  }

  // If no key exists, generate new one
  const newKey = await generateNewKey()

  try {
    await storeKeyInDB(newKey)
    cachedEncryptionKey = newKey
  } catch (error) {
    console.error('Failed to store encryption key:', error)
    return null
  }

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
  const dataBuffer = encoder.encode(data)

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
  const result = btoa(String.fromCharCode.apply(null, Array.from(combined)))
  return result
}

/**
 * Decrypt single field using AES-GCM
 * @param {string} ciphertext - Encrypted data as base64 string
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>} Decrypted data
 */
export async function decryptField(
  data: string,
  key: CryptoKey
): Promise<string> {
  // Convert from Base64 string
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  // Extract IV (first 12 bytes) and data
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

  // Convert ArrayBuffer to string
  const decoder = new TextDecoder()
  const decryptedString = decoder.decode(decryptedBuffer)
  return decryptedString
}

/**
 * Convert ISO date string to Uint8Array salt for cryptographic use
 * @param {string} isoDateString - ISO date string (e.g., "2024-12-11T10:30:45.123Z")
 * @param {number} saltLength - Desired salt length in bytes (default: 32)
 * @returns {Promise<Uint8Array>} Cryptographic salt derived from date
 */
export async function dateToSalt(
  isoDateString: string,
  saltLength = 32
): Promise<Uint8Array> {
  // Convert ISO string to UTF-8 bytes
  const encoder = new TextEncoder()
  const dateBytes = encoder.encode(isoDateString)

  // Use SHA-256 to hash the date string for better distribution
  const hashBuffer = await crypto.subtle.digest('SHA-256', dateBytes)
  const hashArray = new Uint8Array(hashBuffer)

  // If requested salt length is longer than hash, repeat the hash
  if (saltLength <= hashArray.length) {
    const result = hashArray.slice(0, saltLength)
    return result
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
  const derivedKey = await window.crypto.subtle.deriveKey(
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
    true,
    ['encrypt', 'decrypt']
  )

  return derivedKey
}

/**
 * Store encrypted encryption key in database
 * @param {CryptoKey} key - Encryption key to encrypt and store
 * @param {CryptoKey} masterPasswordKey - Key to encrypt the main key with
 * @returns {Promise<PouchDB.Core.Response>} Storage operation result
 */
async function storeEncryptedKeyInDB(
  key: CryptoKey,
  masterPasswordKey: CryptoKey
): Promise<PouchDB.Core.Response> {
  try {
    // Export the key to encrypt it
    const keyData = await window.crypto.subtle.exportKey('jwk', key)

    // Encrypt the entire JWK as a string
    const encryptedKey = await encryptField(
      JSON.stringify(keyData),
      masterPasswordKey
    )

    // Update existing document
    const existingDoc = await localUserDB.get(DocType.LOCAL_USER)
    const updatedDoc = {
      ...existingDoc,
      encryptedKey: encryptedKey,
      updatedAt: new Date().toISOString()
    }

    delete updatedDoc.key

    return await await localUserDB.put(updatedDoc)
  } catch (error) {
    console.error('Failed to store encrypted encryption key:', error)
    throw error
  }
}

/**
 * Initialize encryption system with master password
 * @param {string} masterPassword - Master password
 * @returns {Promise<boolean>} Success status
 */
export async function updateEncryptionWithMP(
  masterPassword: string
): Promise<boolean> {
  try {
    // Create a new encryption key
    const newEncryptionKey = await generateNewKey()

    // Recrypt all the existing secrets with the new key
    await recryptSecrets(newEncryptionKey)

    // Generate salt from the SAME date that will be used for unlocking
    const createdAt = await getLocalUserCreatedTime()
    const salt = await dateToSalt(createdAt, 32)

    // Create encryption key using the salt and the master password
    const keyFromMP = await deriveKeyFromPassword(masterPassword, salt)

    // Store the new encryption key encrypted with the master password-derived key
    await storeEncryptedKeyInDB(newEncryptionKey, keyFromMP)

    // Renew cached values
    cachedEncryptionKey = newEncryptionKey
    cachedMasterPassword = masterPassword

    return true
  } catch (error) {
    console.error('Error in updateEncryptionWithMP:', error)
    return false
  }
}

/**
 * Retrieve and decrypt encryption key from database using master password
 * @param {string} masterPassword - Master password for decryption
 * @param {string} createdAt - Creation date string used for salt generation
 * @returns {Promise<CryptoKey | null>} Decrypted encryption key or null if failed
 */
export async function getAndDecryptKeyFromDB(
  masterPassword: string | CryptoKey,
  createdAt?: string
): Promise<CryptoKey | null> {
  try {
    const keyDoc = await localUserDB.get(DocType.LOCAL_USER)

    if (!keyDoc || !keyDoc.encryptedKey) {
      console.error('No encrypted key found in database')
      return null
    }

    let keyFromMP: CryptoKey

    if (masterPassword instanceof CryptoKey) {
      // Password recovery flow
      keyFromMP = masterPassword
    } else {
      // Generate salt from the SAME date that was used during storage
      const salt = await dateToSalt(createdAt, 32)
      // Derive key from master password using the same salt
      keyFromMP = await deriveKeyFromPassword(masterPassword, salt)
    }

    // Decrypt the stored encryption key (which is a stringified JWK)
    const decryptedKeyString = await decryptField(
      keyDoc.encryptedKey,
      keyFromMP
    )

    // Parse the JWK and import it as a CryptoKey
    const keyData = JSON.parse(decryptedKeyString)

    const importedKey = await window.crypto.subtle.importKey(
      'jwk',
      keyData,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt']
    )

    cachedEncryptionKey = importedKey
    cachedMasterPassword = masterPassword //caches CryptoKey in case of RecoveryFlow
    return importedKey
  } catch (error) {
    console.error('Error retrieving and decrypting encryption key:', error)
    return null
  }
}

/**
 * Convert bytes to mnemonic words using BIP39 wordlist
 * @param {Uint8Array} bytes - Bytes to convert
 * @returns {string[]} Array of mnemonic words
 */

function bytesToMnemonic(bytes: Uint8Array): string[] {
  const words: string[] = []

  // Convert every 11 bits to a word index (BIP39 standard)
  let bitString = ''
  for (const byte of bytes) {
    bitString += byte.toString(2).padStart(8, '0')
  }

  // Take 11 bits at a time and convert to word index
  for (let i = 0; i < bitString.length; i += 11) {
    const bits = bitString.slice(i, i + 11)
    if (bits.length === 11) {
      const wordIndex = parseInt(bits, 2) % BIP39_WORDLIST.words.length
      words.push(BIP39_WORDLIST.words[wordIndex])
    }
  }

  return words
}

/**
 * Generate Shamir Secret Sharing recovery shares for master password
 * @param {string} createdAt - Creation timestamp for salt generation
 * @returns {Promise<{shares: string[], success: boolean}>} Recovery shares as mnemonic words
 */
export async function generateRecoveryShares(createdAt: string) {
  try {
    // Generate salt from creation date
    const salt = await dateToSalt(createdAt, 32)

    // Derive a key from the master password
    const derivedKey = await deriveKeyFromPassword(cachedMasterPassword, salt)

    // Export the key to get raw bytes for Shamir sharing
    const keyData = await window.crypto.subtle.exportKey('raw', derivedKey)
    const keyBytes = new Uint8Array(keyData)

    // Use Shamir Secret Sharing: 1 share, 1 required (as requested)
    const shares = await split(keyBytes, 2, 2)

    // Convert share to mnemonic words
    const mnemonicShares = shares.map((share) => {
      const words = bytesToMnemonic(share)
      return words.join(' ')
    })

    return {
      success: true,
      data: mnemonicShares
    }
  } catch (error) {
    console.error('Error generating recovery shares:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Convert mnemonic words back to bytes
 * @param {string[]} words - Mnemonic words
 * @returns {Uint8Array} Reconstructed bytes
 */
function mnemonicToBytes(words: string[]): Uint8Array {
  let bitString = ''

  for (const word of words) {
    const wordIndex = BIP39_WORDLIST.words.indexOf(word.toLowerCase())
    if (wordIndex === -1) {
      throw new Error(`Invalid mnemonic word: ${word}`)
    }
    bitString += wordIndex.toString(2).padStart(11, '0')
  }

  // Convert bit string back to bytes
  const bytes: number[] = []
  for (let i = 0; i < bitString.length; i += 8) {
    const bits = bitString.slice(i, i + 8)
    if (bits.length === 8) {
      bytes.push(parseInt(bits, 2))
    }
  }

  return new Uint8Array(bytes)
}

/**
 * Reconstruct master password from recovery shares
 * @param {string[]} mnemonicShares - Recovery shares as mnemonic phrases
 * @returns {Promise<{data: CryptoKey | null, success: boolean}>} Reconstructed master key
 */
export async function reconstructMasterKey(mnemonicShares: string[]) {
  try {
    // Convert mnemonic shares back to bytes
    const shareBytes = mnemonicShares.map((mnemonic) => {
      const words = mnemonic.trim().split(/\s+/)
      return mnemonicToBytes(words)
    })

    // Reconstruct the key using Shamir Secret Sharing
    const reconstructedKeyBytes = await combine(shareBytes)

    // Import the reconstructed key
    const reconstructedKey = await window.crypto.subtle.importKey(
      'raw',
      reconstructedKeyBytes,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt']
    )

    return {
      data: reconstructedKey,
      success: true
    }
  } catch (error) {
    console.error('Error reconstructing master password:', error)
    return {
      data: null,
      success: false
    }
  }
}

/**
 * Clear all cached encryption data from memory. Called on lock
 */
export function clearEncryptionCache(): void {
  cachedEncryptionKey = null
  cachedMasterPassword = null
}
