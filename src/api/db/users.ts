import {uuidv7} from 'uuidv7'
import {COUCHDB_CONSTANTS} from '../config.ts'
import {type CouchClient, createCouchClient} from '../couch-client.ts'

const DB = COUCHDB_CONSTANTS.USERS_APP_DB

export interface UserDoc {
  _id: string
  _rev?: string
  type: 'user'
  email: string
  verified: boolean
  createdAt: string
  verifiedAt?: string
}

export interface VerificationCodeDoc {
  _id: string
  _rev?: string
  type: 'verification_code'
  email: string
  codeHash: string
  attempts: number
  expiresAt: string
  createdAt: string
}

export interface UsersDbDeps {
  client?: CouchClient
}

function getClient(deps: UsersDbDeps): CouchClient {
  return deps.client ?? createCouchClient()
}

export function codeDocId(email: string): string {
  return `${COUCHDB_CONSTANTS.CODE_DOC_PREFIX}${email}`
}

export async function initUsersDb(deps: UsersDbDeps = {}): Promise<void> {
  const client = getClient(deps)
  await client.ensureDb(DB)
  await client.ensureIndex(DB, {
    index: {fields: ['email']},
    name: 'email-index'
  })
  await client.ensureIndex(DB, {
    index: {fields: ['type', 'expiresAt']},
    name: 'type-expires-index'
  })
}

export function getVerificationCode(
  email: string,
  deps: UsersDbDeps = {}
): Promise<VerificationCodeDoc | null> {
  return getClient(deps).findDoc<VerificationCodeDoc>(DB, codeDocId(email))
}

export async function upsertVerificationCode(
  doc: VerificationCodeDoc,
  deps: UsersDbDeps = {}
): Promise<void> {
  await getClient(deps).updateDoc(DB, doc)
}

export async function deleteVerificationCode(
  doc: VerificationCodeDoc,
  deps: UsersDbDeps = {}
): Promise<void> {
  if (!doc._rev) return
  await getClient(deps).deleteDoc(DB, doc._id, doc._rev)
}

export async function incrementCodeAttempts(
  doc: VerificationCodeDoc,
  deps: UsersDbDeps = {}
): Promise<void> {
  await getClient(deps).updateDoc(DB, {...doc, attempts: doc.attempts + 1})
}

export async function findUserByEmail(
  email: string,
  deps: UsersDbDeps = {}
): Promise<UserDoc | null> {
  const docs = await getClient(deps).findByMango<UserDoc>(DB, {
    type: COUCHDB_CONSTANTS.APP_USER_TYPE,
    email
  })
  return docs[0] ?? null
}

export async function markUserVerified(
  email: string,
  deps: UsersDbDeps = {}
): Promise<string> {
  const client = getClient(deps)
  const existing = await findUserByEmail(email, {client})
  const now = new Date().toISOString()

  if (existing) {
    await client.updateDoc(DB, {
      ...existing,
      verified: true,
      verifiedAt: now
    })
    return existing._id
  }

  const id = uuidv7()
  const doc: UserDoc = {
    _id: id,
    type: 'user',
    email,
    verified: true,
    createdAt: now,
    verifiedAt: now
  }
  await client.insertDoc(DB, doc)
  return id
}
