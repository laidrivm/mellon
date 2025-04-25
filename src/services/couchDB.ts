import nano from 'nano'

//import {ServiceResponse, UserCreationResponse} from '../types.ts'

const COUCHDB_URL = process.env.COUCH_URL

const nanodb = nano(COUCHDB_URL)

//const nanodb = require('nano')(process.env.COUCH_URL)

/**
 * Generate a secure password using UUID and timestamp
 * @param {string} uuid - User UUID
 * @returns {string} Secure password
 */
function generateSecurePassword(uuid: string): string {
  // TODO: Update on proper password generation function
  const timestamp = Date.now()
  return Bun.hash(uuid + timestamp).toString(16)
}

export async function createCouchDbUser(uuid: string) {
  try {
    // Connect to _users database
    const usersDb = nanodb.use('_users')

    // Create a user document
    const userDoc = {
      _id: `org.couchdb.user:${uuid}`,
      name: uuid,
      type: 'user',
      roles: [],
      password: generateSecurePassword(uuid)
    }

    // Insert the user document
    const response = await usersDb.insert(userDoc)

    if (response.ok) {
      return {
        success: true,
        uuid,
        password: userDoc.password,
        message: 'User created successfully'
      }
    } else {
      return {
        success: false,
        uuid,
        password: userDoc.password,
        message: 'Failed to create user'
      }
    }
  } catch (error) {
    console.error('Error creating CouchDB user:', error)
    return {success: false, uuid, message: 'Error creating user in CouchDB'}
  }
}

export async function createUserRelatedCouchDb(uuid) {
  const dbName = `userdb-${uuid}`

  try {
    await nanodb.db.create(dbName)

    const securityDoc = {
      admins: {names: [], roles: []},
      members: {names: [uuid], roles: []}
    }

    const securityResponse = await nanodb.request({
      db: dbName,
      path: '_security',
      method: 'PUT',
      body: securityDoc
    })

    if (securityResponse.ok) {
      return {success: true, db: dbName, message: 'User created successfully'}
    } else {
      return {
        success: false,
        db: dbName,
        message: `Could not set security for ${dbName}`
      }
    }
  } catch (error) {
    console.error('Error creating database:', error)
    return {
      success: false,
      db: dbName,
      message: 'User created but failed to create database'
    }
  }
}
