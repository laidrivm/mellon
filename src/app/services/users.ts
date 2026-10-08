import {
  DocType,
  type LocalUserDoc,
  type OnboardingStage,
  type ServiceResponse,
  type UserCredentials
} from '../../types.ts'
import {localUserDB} from './pouchDB.ts'
import {wrap} from './result.ts'

export async function existsLocalUser(): Promise<boolean> {
  try {
    await localUserDB.get(DocType.LOCAL_USER)
    return true
  } catch (error) {
    if (error instanceof Error && error.name !== 'not_found')
      console.error('Error getting the onboarding stage:', error)
    return false
  }
}

export function createLocalUser(): Promise<ServiceResponse> {
  return wrap('creating a local user', () =>
    localUserDB.put({
      _id: DocType.LOCAL_USER,
      onboarding: 'secret',
      createdAt: new Date().toISOString()
    })
  )
}

export async function getOnboardingStage(): Promise<OnboardingStage | null> {
  try {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)
    return userDoc.onboarding ?? null
  } catch (error) {
    console.error('Error getting the onboarding stage:', error)
    return null
  }
}

export function updateOnboardingStage(
  stage: OnboardingStage
): Promise<ServiceResponse> {
  return wrap('updating the onboarding stage', async () => {
    const localUserDoc = await localUserDB.get(DocType.LOCAL_USER)
    return localUserDB.put({
      ...localUserDoc,
      onboarding: stage,
      updatedAt: new Date().toISOString()
    })
  })
}

/**
 * Get email from user credentials
 * @returns {Promise<ServiceResponse<{email: string}>>} User email
 */
export async function getEmail(): Promise<
  ServiceResponse<{email: string | undefined}>
> {
  try {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)

    return {
      success: true,
      data: {email: userDoc.email}
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'not_found') {
      return {
        success: false
      }
    }
    console.error('Error getting email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Create a new user account on the backend
 * @param {string} email - User email
 * @returns {Promise<ServiceResponse>} Account creation result
 */
export function storeEmail(email: string): Promise<ServiceResponse> {
  return wrap('storing email', async () => {
    if (!isValidEmail(email)) throw new Error('Invalid email address')
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)
    return localUserDB.put({
      ...userDoc,
      email,
      updatedAt: new Date().toISOString()
    })
  })
}

/**
 * Pure transform: attach verified-user markers to a local user doc.
 * Kept separate from DB access so it can be unit-tested without a DB mock.
 */
export function withEmailVerified(
  doc: LocalUserDoc,
  userId: string,
  now: string
): LocalUserDoc {
  return {...doc, verifiedUserId: userId, verifiedAt: now, updatedAt: now}
}

/**
 * Persist the link between the local account and the server-side verified user.
 * Called once the email verification code succeeds.
 */
export function markEmailVerified(userId: string): Promise<ServiceResponse> {
  return wrap('marking email verified', async () => {
    const userDoc = await localUserDB.get(DocType.LOCAL_USER)
    const now = new Date().toISOString()
    return localUserDB.put(withEmailVerified(userDoc, userId, now))
  })
}

// ---------------------------------------------------------------------------------------------------
// refactoring line ----------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

/**
 * Retrieve user credentials from local database
 * @returns {Promise<UserCredentials | null>} User credentials or null if not found
 */
export async function getUserCredentials(): Promise<UserCredentials | null> {
  try {
    const doc = (await localUserDB.get(
      DocType.USER_CREDENTIALS
    )) as LocalUserDoc & UserCredentials
    return {
      uuid: doc.uuid,
      password: doc.password,
      email: doc.email,
      dbName: doc.dbName,
      createdAt: doc.createdAt
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'not_found') {
      console.error('Error getting user credentials:', error)
    }
    return null
  }
}

/**
 * Create and store user credentials
 * @param {string} uuid - User UUID
 * @param {string} password - User password
 * @param {string} dbName - Database name
 * @returns {Promise<ServiceResponse>} Operation result
 */
export function createUserCredentials(
  uuid: string,
  password: string,
  dbName: string
): Promise<ServiceResponse> {
  return wrap('storing user credentials', async () => {
    if (!uuid || !password || !dbName) {
      throw new Error('Invalid credentials data')
    }
    await localUserDB.put({
      _id: DocType.USER_CREDENTIALS,
      uuid,
      password,
      dbName,
      createdAt: new Date().toISOString()
    })
    return {uuid, dbName}
  })
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Whether user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const credentials = await getUserCredentials()
  return !!credentials
}
