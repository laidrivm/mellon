import {localUserDB} from './pouchDB.ts'

async function getKeyFromDB() {
  try {
    const keyDoc = await localUserDB.get('key:encryptionKey')

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
  }
}

async function generateNewKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

async function storeKeyInDB(key) {
  try {
    const keyData = await window.crypto.subtle.exportKey('jwk', key)

    const keyDoc = {
      _id: `key:encryptionKey`,
      key: keyData,
      createdAt: new Date().toISOString(),
      type: 'encryptionKey'
    }

    return await localUserDB.put(keyDoc)
  } catch (error) {
    console.error('Failed to store encryption key:', error)
  }
}

export async function getEncryptionKey() {
  const key = await getKeyFromDB()
  if (key) return key

  const newKey = await generateNewKey()
  await storeKeyInDB(newKey)
  return newKey
}

export async function encryptField(data, key) {
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
  return btoa(String.fromCharCode.apply(null, combined))
}

export async function decryptField(ciphertext, key) {
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
