import nano, {type ServerScope} from 'nano'
import {COUCHDB_CONSTANTS, getCouchDbConfig} from './config.ts'

interface SecurityDocument {
  admins: {names: string[]; roles: string[]}
  members: {names: string[]; roles: string[]}
}

interface InsertResult {
  ok: boolean
  id?: string
}

export interface CouchClient {
  createDb: (name: string) => Promise<void>
  insertDoc: <T extends {_id?: string}>(
    dbName: string,
    doc: T
  ) => Promise<InsertResult>
  putSecurity: (dbName: string, security: SecurityDocument) => Promise<boolean>
}

export function adaptCouchClient(server: ServerScope): CouchClient {
  return {
    createDb: async (name) => {
      await server.db.create(name)
    },
    insertDoc: async (dbName, doc) => {
      const response = await server.use(dbName).insert(doc)
      return {ok: response.ok === true, id: response.id}
    },
    putSecurity: async (dbName, security) => {
      const response = await server.request({
        db: dbName,
        path: COUCHDB_CONSTANTS.SECURITY_PATH,
        method: 'PUT',
        body: security
      })
      return response.ok === true
    }
  }
}

export function createCouchClient(): CouchClient {
  return adaptCouchClient(nano(getCouchDbConfig().url))
}

export function isConflictError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    (error as {statusCode: unknown}).statusCode === 409
  )
}
