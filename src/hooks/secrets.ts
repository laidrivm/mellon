import {localDB} from '../services/db.ts'

import type {Secret} from '../types.ts'

export async function createSecret(secret: Secret) {
  secret._id = `secret:${Date.now()}`
  secret.createdAt = new Date().toISOString()

  await localDB.put(secret)
}

export async function getAllSecrets() {
  const result = await localDB.allDocs({
    include_docs: true,
    descending: true
  })
  return result
}

export async function getSecret(_id) {
  return await localDB.get(_id)
}

export async function updateSecret(secret) {
  await localDB.put(secret)
}
