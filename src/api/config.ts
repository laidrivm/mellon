/**
 * API Configuration Module
 * Centralizes all configuration and constants for the API layer
 */

export const COUCHDB_CONSTANTS = {
  USERS_DB: '_users',
  USER_PREFIX: 'org.couchdb.user:',
  USER_DB_PREFIX: 'userdb-',
  SECURITY_PATH: '_security',
  USER_TYPE: 'user',
  USERS_APP_DB: 'mellon-users',
  CODE_DOC_PREFIX: 'vcode::',
  VERIFICATION_CODE_TYPE: 'verification_code',
  APP_USER_TYPE: 'user'
} as const

export const EMAIL_VERIFICATION = {
  CODE_TTL_MS: 10 * 60 * 1000,
  MAX_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 3,
  CODE_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const

export const PASSWORD_CONSTANTS = {
  LENGTH: 16,
  CHARSET:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
} as const

export const ERROR_MESSAGES = {
  USER_CREATION_FAILED: 'Failed to create user',
  USER_CREATION_ERROR: 'Error creating user in CouchDB',
  DB_CREATION_ERROR: 'Failed to create user database',
  DB_SECURITY_ERROR: 'Could not set security for database',
  UUID_GENERATION_ERROR: 'Failed to generate UUID or create user',
  CONNECTION_ERROR: 'Database connection failed',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_CODE: 'Invalid or expired code',
  CODE_EXPIRED: 'Code has expired',
  TOO_MANY_ATTEMPTS: 'Too many attempts',
  RATE_LIMITED: 'Too many requests, try again later',
  EMAIL_SEND_FAILED: 'Failed to send verification email'
} as const

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
  const url = process.env['COUCH_URL'] ?? 'http://localhost:5984'
  return {url}
}

export function getEmailServiceUrl(): string {
  // biome-ignore lint/complexity/useLiteralKeys: required by noPropertyAccessFromIndexSignature
  return process.env['EMAIL_SERVICE_URL'] ?? 'http://mellon-email:3001'
}
