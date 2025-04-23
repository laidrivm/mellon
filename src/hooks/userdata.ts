import {localUserDB} from '../services/pouchDB.ts'

export async function getUserCredentials() {
  try {
    return await localUserDB.get('user_credentials')
  } catch (error) {
    if (error.name !== 'not_found') {
      console.error('Error checking local PouchDB:', error)
    }
  }
}

export async function createUserCredentials(uuid, password, dbName) {
  try {
    await localUserDB.put({
      _id: 'user_credentials',
      uuid,
      password,
      dbName,
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error storing UUID in PouchDB:', error)
  }
}
