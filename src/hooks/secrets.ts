import {v7 as uuidv7} from 'uuid'

import {localSecretsDB} from '../services/pouchDB.ts'
import {
  encryptField,
  decryptField,
  getEncryptionKey
} from '../services/encryption.ts'

import type {Secret} from '../types.ts'

export async function createSecret(secret: Secret) {
  try {
    const encryptionKey = await getEncryptionKey()
    secret._id = `secret:${uuidv7()}`
    secret.createdAt = new Date().toISOString()
    secret.password = await encryptField(secret.password, encryptionKey)
    await localSecretsDB.put(secret)
  } catch (error) {
    console.error('Error creating document:', error)
  }
}

export async function getAllSecrets() {
  try {
    const encryptionKey = await getEncryptionKey()
    const result = await localSecretsDB.allDocs({
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
    const secret = await localSecretsDB.get(_id)
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
    const secret = await localSecretsDB.get(_id)

    const updatedSecret = {
      ...secret,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await localSecretsDB.put(updatedSecret)
  } catch {
    console.error('Error updating document:', error)
  }
  await localSecretsDB.put(secret)
}

export async function deleteSecret(_id) {
  try {
    const secret = await localSecretsDB.get(_id)
    await localSecretsDB.remove(secret)
  } catch (error) {
    console.error('Error deleting document:', error)
  }
}
