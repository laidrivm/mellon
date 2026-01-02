/**
 * API Module - Public Exports
 * Provides clean public interface for the API layer
 */

export type {CouchDbConfig} from './config.ts'
// Configuration
export {
  COUCHDB_CONSTANTS,
  ERROR_MESSAGES,
  getCouchDbConfig,
  PASSWORD_CONSTANTS,
  SUCCESS_MESSAGES
} from './config.ts'
export type {CouchClient} from './couch-client.ts'
// Client
export {
  createCouchClient,
  getDefaultCouchClient,
  resetDefaultCouchClient
} from './couch-client.ts'
export type {
  DatabaseCreationResult,
  DatabaseRepositoryDeps
} from './database-repository.ts'
export {createUserDatabase, getUserDbName} from './database-repository.ts'
// Errors
export {
  ApiError,
  ConnectionError,
  DatabaseError,
  ErrorCategory,
  ErrorCode,
  getErrorMessage,
  isApiError,
  UserCreationError
} from './errors.ts'
export type {
  GenerateUuidDeps,
  UserService,
  UuidGenerator
} from './generate-uuid.ts'
// Main service
export {generateUUID} from './generate-uuid.ts'
export type {PasswordGenerator} from './password.ts'
// Password
export {defaultPasswordGenerator, generateSecurePassword} from './password.ts'
export type {UserCreationResult, UserRepositoryDeps} from './user-repository.ts'
// Repositories
export {createCouchDbUser} from './user-repository.ts'
