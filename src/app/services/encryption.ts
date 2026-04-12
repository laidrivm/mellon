import {
  getEncryptedKeyBlob,
  getKeyFromDB,
  getLocalUserCreatedTime,
  hasEncryptedKey,
  storeEncryptedKeyInDB,
  storeKeyInDB
} from './crypto/keyStore.ts'
import {
  dateToSalt,
  decryptField,
  deriveKeyFromPassword,
  generateNewKey
} from './crypto/webcrypto.ts'
import {recryptSecrets} from './secrets.ts'
import {getCachedKey, setCachedKey, setCachedMasterPassword} from './session.ts'

export {
  generateRecoveryShares,
  reconstructMasterKey
} from './crypto/recovery.ts'
export {
  dateToSalt,
  decryptField,
  deriveKeyFromPassword,
  encryptField
} from './crypto/webcrypto.ts'

export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const cached = getCachedKey()
  if (cached) return cached

  const key = await getKeyFromDB()
  if (key) {
    setCachedKey(key)
    return key
  }

  if (await hasEncryptedKey()) return null

  const newKey = await generateNewKey()
  try {
    await storeKeyInDB(newKey)
    setCachedKey(newKey)
  } catch (error) {
    console.error('Failed to store encryption key:', error)
    return null
  }
  return newKey
}

export async function updateEncryptionWithMP(
  masterPassword: string
): Promise<boolean> {
  try {
    const newEncryptionKey = await generateNewKey()

    await recryptSecrets(newEncryptionKey)

    const createdAt = await getLocalUserCreatedTime()
    if (!createdAt) {
      console.error('No creation time found for user')
      return false
    }
    const salt = await dateToSalt(createdAt, 32)
    const keyFromMP = await deriveKeyFromPassword(masterPassword, salt)

    await storeEncryptedKeyInDB(newEncryptionKey, keyFromMP)

    setCachedKey(newEncryptionKey)
    setCachedMasterPassword(masterPassword)
    return true
  } catch (error) {
    console.error('Error in updateEncryptionWithMP:', error)
    return false
  }
}

export async function getAndDecryptKeyFromDB(
  masterPassword: string | CryptoKey,
  createdAt?: string
): Promise<CryptoKey | null> {
  try {
    const encryptedKey = await getEncryptedKeyBlob()
    if (!encryptedKey) {
      console.error('No encrypted key found in database')
      return null
    }

    let keyFromMP: CryptoKey
    if (masterPassword instanceof CryptoKey) {
      keyFromMP = masterPassword
    } else {
      if (!createdAt) {
        console.error('No creation time provided for key derivation')
        return null
      }
      const salt = await dateToSalt(createdAt, 32)
      keyFromMP = await deriveKeyFromPassword(masterPassword, salt)
    }

    const decryptedKeyString = await decryptField(encryptedKey, keyFromMP)
    const keyData = JSON.parse(decryptedKeyString)

    const importedKey = await crypto.subtle.importKey(
      'jwk',
      keyData,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt']
    )

    setCachedKey(importedKey)
    if (typeof masterPassword === 'string') {
      setCachedMasterPassword(masterPassword)
    }
    return importedKey
  } catch (error) {
    console.error('Error retrieving and decrypting encryption key:', error)
    return null
  }
}
