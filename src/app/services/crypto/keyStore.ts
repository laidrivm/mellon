import {DocType} from '../../../types.ts'
import {localUserDB} from '../pouchDB.ts'
import {encryptField} from './webcrypto.ts'

export async function getKeyFromDB(): Promise<CryptoKey | null> {
  try {
    const keyDoc = await localUserDB.get(DocType.LOCAL_USER)

    if (keyDoc?.key) {
      return await crypto.subtle.importKey(
        'jwk',
        keyDoc.key,
        {name: 'AES-GCM', length: 256},
        false,
        ['encrypt', 'decrypt']
      )
    }

    return null
  } catch (error) {
    if (error instanceof Error && error.name !== 'not_found') {
      console.error('Error retrieving encryption key:', error)
    }
    return null
  }
}

export async function hasEncryptedKey(): Promise<boolean> {
  try {
    const keyDoc = await localUserDB.get(DocType.LOCAL_USER)
    return !!keyDoc?.encryptedKey
  } catch {
    return false
  }
}

export async function getLocalUserCreatedTime(): Promise<string | null> {
  try {
    const doc = await localUserDB.get(DocType.LOCAL_USER)
    return doc.createdAt ?? null
  } catch (error) {
    if (error instanceof Error && error.name !== 'not_found') {
      console.error('Error retrieving user creation time:', error)
    }
    return null
  }
}

export async function storeKeyInDB(
  key: CryptoKey
): Promise<PouchDB.Core.Response> {
  const keyData = await crypto.subtle.exportKey('jwk', key)
  const doc = await localUserDB.get(DocType.LOCAL_USER)

  return await localUserDB.put({
    ...doc,
    key: keyData,
    updatedAt: new Date().toISOString()
  })
}

export async function storeEncryptedKeyInDB(
  key: CryptoKey,
  masterPasswordKey: CryptoKey
): Promise<PouchDB.Core.Response> {
  try {
    const keyData = await crypto.subtle.exportKey('jwk', key)
    const encryptedKey = await encryptField(
      JSON.stringify(keyData),
      masterPasswordKey
    )

    const existingDoc = await localUserDB.get(DocType.LOCAL_USER)
    const updatedDoc = {
      ...existingDoc,
      encryptedKey: encryptedKey,
      updatedAt: new Date().toISOString()
    }
    delete updatedDoc.key

    return await localUserDB.put(updatedDoc)
  } catch (error) {
    console.error('Failed to store encrypted encryption key:', error)
    throw error
  }
}

export async function getEncryptedKeyBlob(): Promise<string | null> {
  try {
    const keyDoc = await localUserDB.get(DocType.LOCAL_USER)
    return keyDoc?.encryptedKey ?? null
  } catch {
    return null
  }
}

export async function storeEncryptedKeyByRecoveryInDB(
  key: CryptoKey,
  recoveryWrapKey: CryptoKey
): Promise<PouchDB.Core.Response> {
  const keyData = await crypto.subtle.exportKey('jwk', key)
  const encryptedBlob = await encryptField(
    JSON.stringify(keyData),
    recoveryWrapKey
  )
  const doc = await localUserDB.get(DocType.LOCAL_USER)
  return await localUserDB.put({
    ...doc,
    encryptedKeyByRecovery: encryptedBlob,
    updatedAt: new Date().toISOString()
  })
}

export async function getEncryptedKeyByRecoveryBlob(): Promise<string | null> {
  try {
    const keyDoc = await localUserDB.get(DocType.LOCAL_USER)
    return keyDoc?.encryptedKeyByRecovery ?? null
  } catch {
    return null
  }
}
