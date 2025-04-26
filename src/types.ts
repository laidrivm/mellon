/**
 * Represents a stored secret (password)
 * @interface Secret
 */
export interface Secret {
  _id?: string // PouchDB document ID
  name: string
  username: string
  password: string
  notes?: string
  url?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Represents user account credentials
 * @interface UserCredentials
 */
export interface UserCredentials {
  uuid: string
  password: string
  dbName: string
  createdAt?: string
}

/**
 * Represents encryption key document
 * @interface EncryptionKeyDocument
 */
export interface EncryptionKeyDocument {
  _id: string
  key: JsonWebKey
  createdAt: string
  type: 'encryptionKey'
}

/**
 * Represents master password data
 * @interface MasterPassword
 */
export interface MasterPassword {
  password: string
  hint?: string
  createdAt?: string
}

/**
 * Connection status states
 * @type ConnectionState
 */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'local_only'
  | 'offline'

/**
 * User status states
 * @type UserState
 */
export type UserState = 'loading' | 'no_uuid' | 'has_uuid' | 'has_email'

/**
 * Response from remote services
 * @interface ServiceResponse
 */
export interface ServiceResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: Error | string
}

/**
 * User creation response
 * @interface UserCreationResponse
 */
export interface UserCreationResponse extends ServiceResponse {
  uuid?: string
  password?: string
  db?: string
}

/**
 * Button styling options
 * @type ButtonStyle
 */
export type ButtonStyle =
  | 'primary'
  | 'secondary'
  | 'inline'
  | 'danger'
  | 'ghost'

/**
 * Onboarding stages
 * @type OnboardingStage
 */
export type OnboardingStage = 'secret' | 'master' | 'sign' | 'finished'

/**
 * Database names used in application
 * @type DbName
 */
export enum DbName {
  SECRETS = 'mellon_secrets',
  USER = 'mellon_user_data'
}

/**
 * Document types stored in database
 * @type DocType
 */
export enum DocType {
  SECRET = 'secret',
  USER_CREDENTIALS = 'user_credentials',
  ENCRYPTION_KEY = 'encryption_key',
  MASTER_PASSWORD = 'master_password'
}
