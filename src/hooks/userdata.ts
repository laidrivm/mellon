import {localUserDB} from '../services/pouchDB.ts'

export async function getUserCredentials() {
  try {
    const doc = await localUserDB.get('user_credentials')
    return {
      uuid: doc.uuid,
      password: doc.password,
      dbName: doc.dbName
    }
  } catch (error) {
    if (error.name !== 'not_found') {
      console.error('Error getting user credentials:', error)
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

export async function isAuthenticated() {
  const credentials = await getUserCredentials()
  return !!credentials
}
