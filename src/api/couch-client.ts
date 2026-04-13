import nano, {type MangoSelector, type ServerScope} from 'nano'
import {COUCHDB_CONSTANTS, getCouchDbConfig} from './config.ts'

interface SecurityDocument {
  admins: {names: string[]; roles: string[]}
  members: {names: string[]; roles: string[]}
}

interface InsertResult {
  ok: boolean
  id?: string
  rev?: string
}

export interface MangoIndex {
  index: {fields: string[]}
  name: string
}

export interface CouchClient {
  createDb: (name: string) => Promise<void>
  ensureDb: (name: string) => Promise<void>
  ensureIndex: (dbName: string, index: MangoIndex) => Promise<void>
  insertDoc: <T extends {_id?: string}>(
    dbName: string,
    doc: T
  ) => Promise<InsertResult>
  updateDoc: <T extends {_id: string; _rev?: string}>(
    dbName: string,
    doc: T
  ) => Promise<InsertResult>
  findDoc: <T>(dbName: string, id: string) => Promise<T | null>
  findByMango: <T>(dbName: string, selector: MangoSelector) => Promise<T[]>
  deleteDoc: (dbName: string, id: string, rev: string) => Promise<void>
  putSecurity: (dbName: string, security: SecurityDocument) => Promise<boolean>
}

export function adaptCouchClient(server: ServerScope): CouchClient {
  return {
    createDb: async (name) => {
      await server.db.create(name)
    },
    ensureDb: async (name) => {
      try {
        await server.db.create(name)
      } catch (error) {
        if (!isAlreadyExistsError(error)) throw error
      }
    },
    ensureIndex: async (dbName, index) => {
      await server.request({
        db: dbName,
        path: '_index',
        method: 'POST',
        body: {index: index.index, name: index.name, type: 'json'}
      })
    },
    insertDoc: async (dbName, doc) => {
      const response = await server.use(dbName).insert(doc)
      return {
        ok: response.ok === true,
        id: response.id,
        rev: response.rev
      }
    },
    updateDoc: async (dbName, doc) => {
      const response = await server.use(dbName).insert(doc)
      return {
        ok: response.ok === true,
        id: response.id,
        rev: response.rev
      }
    },
    findDoc: async <T>(dbName: string, id: string): Promise<T | null> => {
      try {
        return (await server.use(dbName).get(id)) as T
      } catch (error) {
        if (isNotFoundError(error)) return null
        throw error
      }
    },
    findByMango: async <T>(
      dbName: string,
      selector: MangoSelector
    ): Promise<T[]> => {
      const result = await server.use(dbName).find({selector})
      return (result.docs ?? []) as T[]
    },
    deleteDoc: async (dbName, id, rev) => {
      await server.use(dbName).destroy(id, rev)
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

function statusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const value = (error as {statusCode?: unknown}).statusCode
  return typeof value === 'number' ? value : undefined
}

export function isConflictError(error: unknown): boolean {
  return statusCode(error) === 409
}

export function isNotFoundError(error: unknown): boolean {
  return statusCode(error) === 404
}

export function isAlreadyExistsError(error: unknown): boolean {
  const code = statusCode(error)
  return code === 412 || code === 409
}
