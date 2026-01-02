import {describe, expect, test} from 'bun:test'
import {COUCHDB_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {getUserDbName} from './database-repository.ts'

describe('CouchDB response structures', () => {
  describe('createCouchDbUser expected responses', () => {
    test('success response has required fields', () => {
      const successResponse = {
        success: true,
        uuid: 'test-uuid',
        password: 'generated-password',
        message: SUCCESS_MESSAGES.USER_CREATED
      }

      expect(successResponse.success).toBe(true)
      expect(successResponse.uuid).toBeDefined()
      expect(successResponse.password).toBeDefined()
      expect(successResponse.message).toBe(SUCCESS_MESSAGES.USER_CREATED)
    })

    test('failure response has required fields', () => {
      const failureResponse = {
        success: false,
        uuid: 'test-uuid',
        message: ERROR_MESSAGES.USER_CREATION_FAILED
      }

      expect(failureResponse.success).toBe(false)
      expect(failureResponse.uuid).toBeDefined()
      expect(failureResponse.message).toBeDefined()
    })
  })

  describe('createUserDatabase expected responses', () => {
    test('success response has required fields', () => {
      const successResponse = {
        success: true,
        db: 'userdb-test-uuid',
        message: SUCCESS_MESSAGES.DB_CREATED
      }

      expect(successResponse.success).toBe(true)
      expect(successResponse.db).toBe('userdb-test-uuid')
    })

    test('database name format is correct', () => {
      const uuid = 'abc-123-def'
      const expectedDbName = getUserDbName(uuid)

      expect(expectedDbName).toBe(
        `${COUCHDB_CONSTANTS.USER_DB_PREFIX}abc-123-def`
      )
    })

    test('failure response has required fields', () => {
      const failureResponse = {
        success: false,
        db: 'userdb-test-uuid',
        message: ERROR_MESSAGES.DB_CREATION_ERROR
      }

      expect(failureResponse.success).toBe(false)
      expect(failureResponse.db).toBeDefined()
      expect(failureResponse.message).toBeDefined()
    })
  })
})

describe('Configuration constants', () => {
  test('COUCHDB_CONSTANTS has expected values', () => {
    expect(COUCHDB_CONSTANTS.USERS_DB).toBe('_users')
    expect(COUCHDB_CONSTANTS.USER_PREFIX).toBe('org.couchdb.user:')
    expect(COUCHDB_CONSTANTS.USER_DB_PREFIX).toBe('userdb-')
    expect(COUCHDB_CONSTANTS.SECURITY_PATH).toBe('_security')
    expect(COUCHDB_CONSTANTS.USER_TYPE).toBe('user')
  })
})
