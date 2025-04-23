import {v7 as uuidv7} from 'uuid'
import {createCouchDbUser} from '../services/couchDB.ts'

export default async function generateUUID() {
  try {
    // Generate UUIDv7
    const uuid = uuidv7()

    // Create user in CouchDB
    const response = await createCouchDbUser(uuid)

    return new Response(
      JSON.stringify({
        uuid,
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
