import {localUserDB} from '../services/pouchDB.ts'

export async function getUserID() {
  try {
    return await localUserDB.get('user_uuid')
  } catch (error) {
    if (error.name !== 'not_found') {
      console.error('Error checking local PouchDB:', error)
    }
  }
}

export async function createUserID(uuid) {
  try {
    await localUserDB.put({
      _id: 'user_uuid',
      uuid,
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error storing UUID in PouchDB:', error)
  }
}
