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
  createdAt?: string
  updatedAt?: string
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
  error?: string
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
export type OnboardingStage =
  | 'secret'
  | 'master'
  | 'recovery'
  | 'sign'
  | 'code'
  | 'finished'

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
  LOCAL_USER = 'local_user',
  SECRET = 'secret'
}

export interface AddSecretFormProps {
  onboarding: OnboardingStage
  addSecret: (secret: Secret) => Promise<void>
  handleSetShowtForm: (form: FormState) => void
  formError?: string | null
  initialData?: Secret | null
}

export interface StoredSecretsProps {
  secrets: Secret[]
  showForm: FormState
  handleSetShowtForm: (form: FormState) => void
  removeSecret: (secretId: string) => void
}

export interface MasterPasswordFormProps {
  addMasterPassword: (masterPassword: MasterPassword) => void
  handleSetShowtForm: (form: FormState) => void
  formError?: string | null
  initialData?: MasterPassword | null
}

export interface UnlockFormProps {
  tryUnlock: (masterPasswordCandidate: string) => void
  handleSetShowtForm: (form: FormState) => void
  formError?: string | null
}

export type FormState =
  | 'secret'
  | 'masterPassword'
  | 'recovery'
  | 'email'
  | 'emailCode'

export interface RecoveryDisplayProps {
  onContinue: () => void
}
