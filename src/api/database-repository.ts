import {COUCHDB_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {type CouchClient, createCouchClient} from './couch-client.ts'
import {DatabaseError, ErrorCode} from './errors.ts'
import {withApiError} from './with-api-error.ts'

export interface DatabaseCreationResult {
  success: boolean
  db: string
  message: string
}

export interface DatabaseRepositoryDeps {
  client?: CouchClient
}

export function getUserDbName(uuid: string): string {
  return `${COUCHDB_CONSTANTS.USER_DB_PREFIX}${uuid}`
}

function buildSecurityDocument(uuid: string) {
  return {
    admins: {names: [], roles: []},
    members: {names: [uuid], roles: []}
  }
}

export async function createUserDatabase(
  uuid: string,
  deps: DatabaseRepositoryDeps = {}
): Promise<DatabaseCreationResult> {
  const client = deps.client ?? createCouchClient()
  const dbName = getUserDbName(uuid)

  return withApiError(
    (cause) =>
      new DatabaseError(
        dbName,
        ERROR_MESSAGES.DB_CREATION_ERROR,
        ErrorCode.DATABASE_CREATION_FAILED,
        cause
      ),
    async () => {
      await client.createDb(dbName)
      const securitySet = await client.putSecurity(
        dbName,
        buildSecurityDocument(uuid)
      )
      return securitySet
        ? {success: true, db: dbName, message: SUCCESS_MESSAGES.DB_CREATED}
        : {
            success: false,
            db: dbName,
            message: `${ERROR_MESSAGES.DB_SECURITY_ERROR}: ${dbName}`
          }
    }
  )
}
