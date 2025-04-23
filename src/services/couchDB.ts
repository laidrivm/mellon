import nano from 'nano'

const nanodb = nano('http://admin:password@localhost:5984')

export async function createCouchDbUser(uuid) {
  try {
    // Connect to _users database
    const usersDb = nanodb.use('_users')

    // Create a user document
    const userDoc = {
      _id: `org.couchdb.user:${uuid}`,
      name: uuid,
      type: 'user',
      roles: [],
      password: Bun.hash(uuid + Date.now()).toString(16) // Generate a secure password
    }

    // Insert the user document
    const response = await usersDb.insert(userDoc)

    if (response.ok) {
      return {success: true, message: 'User created successfully'}
    } else {
      return {success: false, message: 'Failed to create user'}
    }
  } catch (error) {
    console.error('Error creating CouchDB user:', error)
    return {success: false, message: 'Error creating user in CouchDB'}
  }
}
