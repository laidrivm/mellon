import {localDB} from '../services/db.ts'

import type {Secret} from '../types.ts'

export async function createSecret(secret: Secret) {
  try {
    secret._id = `secret:${Date.now()}`
    secret.createdAt = new Date().toISOString()
    await localDB.put(secret)
  } catch (error) {
    console.error('Error creating document:', error)
  }
}

export async function getAllSecrets() {
  try {
    return await localDB.allDocs({
      include_docs: true,
      descending: true
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
  }
}

export async function getSecret(_id) {
  try {
    return await localDB.get(_id)
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
