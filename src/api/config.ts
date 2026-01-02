/**
 * API Configuration Module
 * Centralizes all configuration and constants for the API layer
 */

// Database constants
export const COUCHDB_CONSTANTS = {
  USERS_DB: '_users',
  USER_PREFIX: 'org.couchdb.user:',
  USER_DB_PREFIX: 'userdb-',
  SECURITY_PATH: '_security',
  USER_TYPE: 'user'
} as const

// Password generation constants
export const PASSWORD_CONSTANTS = {
  LENGTH: 32,
  CHARSET:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
} as const

// Error messages
export const ERROR_MESSAGES = {
  USER_CREATION_FAILED: 'Failed to create user',
  USER_CREATION_ERROR: 'Error creating user in CouchDB',
  DB_CREATION_ERROR: 'Failed to create user database',
  DB_SECURITY_ERROR: 'Could not set security for database',
  UUID_GENERATION_ERROR: 'Failed to generate UUID or create user',
  CONNECTION_ERROR: 'Database connection failed'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  DB_CREATED: 'Database created successfully'
} as const

/**
 * CouchDB Configuration
 * Loads configuration from environment variables with defaults
 */
export interface CouchDbConfig {
  url: string
}

/**
 * Get CouchDB configuration from environment
 */
export function getCouchDbConfig(): CouchDbConfig {
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  const url = process.env['COUCH_URL'] ?? 'http://localhost:5984'
  return {url}
}
