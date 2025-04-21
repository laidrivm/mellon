import {localDB} from '../services/db.ts'

import type {Secret} from '../types.ts'

export async function createSecret(secret: Secret) {
  try {
    // Add a unique _id if not provided
    if (!secret._id) {
      secret.id = `secret:${Date.now()}`
    }

    // Add timestamp
    secret.createdAt = new Date().toISOString()

    const response = await localDB.put(secret)
    return response
  } catch (error) {
    console.error('Error creating document:', error)
    throw error
  }
}

export async function getSecret(id: string) {
  try {
    return await localDB.get(id)
  } catch (error) {
    console.error('Error fetching document:', error)
    throw error
  }
}

export async function getAllSecrets() {
  try {
    const result = await localDB.allDocs({
      include_docs: true,
      startkey: 'secret:',
      endkey: 'secret:\ufff0'
    })

    return result.rows.map((row) => row.doc)
  } catch (error) {
    console.error('Error fetching documents:', error)
    throw error
  }
}
