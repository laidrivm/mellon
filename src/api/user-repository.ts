import {COUCHDB_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {type CouchClient, createCouchClient} from './couch-client.ts'
import {UserCreationError} from './errors.ts'
import {generateSecurePassword} from './password.ts'
import {withApiError} from './with-api-error.ts'

export interface UserCreationResult {
  success: boolean
  uuid: string
  password?: string
  message: string
}

export interface UserRepositoryDeps {
  client?: CouchClient
}

function buildUserDocument(uuid: string, password: string) {
  return {
    _id: `${COUCHDB_CONSTANTS.USER_PREFIX}${uuid}`,
    name: uuid,
    type: COUCHDB_CONSTANTS.USER_TYPE,
    roles: [] as string[],
    password
  }
}

export async function createCouchDbUser(
  uuid: string,
  deps: UserRepositoryDeps = {}
): Promise<UserCreationResult> {
  const client = deps.client ?? createCouchClient()
  const password = generateSecurePassword()
  const userDoc = buildUserDocument(uuid, password)

  return withApiError(
    (cause) =>
      new UserCreationError(uuid, ERROR_MESSAGES.USER_CREATION_ERROR, cause),
    async () => {
      const result = await client.insertDoc(COUCHDB_CONSTANTS.USERS_DB, userDoc)
      return result.ok
        ? {
            success: true,
            uuid,
            password,
            message: SUCCESS_MESSAGES.USER_CREATED
          }
        : {
            success: false,
            uuid,
            message: ERROR_MESSAGES.USER_CREATION_FAILED
          }
    }
  )
}
