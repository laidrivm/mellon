import {localDB} from '../services/db.ts'
import {
  encryptField,
  decryptField,
  getEncryptionKey
} from '../services/encryption.ts'

import type {Secret} from '../types.ts'

export async function createSecret(secret: Secret) {
  try {
    const encryptionKey = await getEncryptionKey()
    secret._id = `secret:${Date.now()}`
    secret.createdAt = new Date().toISOString()
    secret.password = await encryptField(secret.password, encryptionKey)
    await localDB.put(secret)
  } catch (error) {
    console.error('Error creating document:', error)
  }
}

export async function getAllSecrets() {
  try {
    const encryptionKey = await getEncryptionKey()
    const result = await localDB.allDocs({
      include_docs: true,
      descending: true,
      startkey: 'secret:\uffff',
      endkey: 'secret:'
    })
    console.log(result)
    for (const row of result.rows) {
      row.doc.password = await decryptField(row.doc.password, encryptionKey)
    }
    return result
  } catch (error) {
    console.error('Error fetching documents:', error)
  }
}

export async function getSecret(_id) {
  try {
    const secret = await localDB.get(_id)
    const encryptionKey = await getEncryptionKey()
    return {
      ...secret,
      password: await decryptField(secret.password, encryptionKey)
    }
  } catch (error) {
    console.error('Error fetching document:', error)
  }
}

export async function updateSecret(_id, updates) {
  try {
    const secret = await localDB.get(_id)

    const updatedSecret = {
      ...secret,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await localDB.put(updatedSecret)
  } catch {
    console.error('Error updating document:', error)
  }
  await localDB.put(secret)
}

export async function deleteSecret(_id) {
  try {
    const secret = await localDB.get(_id)
    await localDB.remove(secret)
  } catch (error) {
    console.error('Error deleting document:', error)
  }
}
