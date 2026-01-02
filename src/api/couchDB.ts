/**
 * CouchDB Module - Facade for backward compatibility
 * Re-exports from specialized repository modules
 *
 * @deprecated Import directly from user-repository.ts and database-repository.ts
 */

export {createCouchClient, getDefaultCouchClient} from './couch-client.ts'
export {
  createUserDatabase as createUserRelatedCouchDb,
  getUserDbName
} from './database-repository.ts'
export {createCouchDbUser} from './user-repository.ts'
