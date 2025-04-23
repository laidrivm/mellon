import {v7 as uuidv7} from 'uuid'
import {
  createCouchDbUser,
  createUserRelatedCouchDb
} from '../services/couchDB.ts'

export default async function generateUUID() {
  try {
    const uuid = uuidv7()

    const user = await createCouchDbUser(uuid)
    const db = await createUserRelatedCouchDb(uuid)

    const response = {
      ...user,
      ...db
    }

    return new Response(
      JSON.stringify({
        ...response,
        success: response.success,
        message: response.message
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('Error generating UUID or creating user:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to generate UUID or create user'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
}
