import {describe, expect, test} from 'bun:test'
import {
  ApiError,
  ConnectionError,
  DatabaseError,
  ErrorCategory,
  ErrorCode,
  getErrorMessage,
  isApiError,
  UserCreationError
} from './errors.ts'

describe('Custom Error Types', () => {
  describe('ApiError', () => {
    test('creates error with all properties', () => {
      const error = new ApiError(
        'Test error',
        ErrorCode.UNKNOWN_ERROR,
        ErrorCategory.VALIDATION
      )

      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(error.category).toBe(ErrorCategory.VALIDATION)
      expect(error.name).toBe('ApiError')
    })

    test('includes cause when provided', () => {
      const cause = new Error('Original error')
      const error = new ApiError(
        'Wrapped error',
        ErrorCode.UNKNOWN_ERROR,
        ErrorCategory.VALIDATION,
        cause
      )

      expect(error.cause).toBe(cause)
    })
  })

  describe('UserCreationError', () => {
    test('creates error with uuid', () => {
      const error = new UserCreationError('test-uuid', 'User creation failed')

      expect(error.uuid).toBe('test-uuid')
      expect(error.code).toBe(ErrorCode.USER_CREATION_FAILED)
      expect(error.category).toBe(ErrorCategory.USER)
      expect(error.name).toBe('UserCreationError')
    })
  })

  describe('DatabaseError', () => {
    test('creates error with database name', () => {
      const error = new DatabaseError('userdb-123', 'Database creation failed')

      expect(error.dbName).toBe('userdb-123')
      expect(error.code).toBe(ErrorCode.DATABASE_CREATION_FAILED)
      expect(error.category).toBe(ErrorCategory.DATABASE)
      expect(error.name).toBe('DatabaseError')
    })

    test('accepts custom error code', () => {
      const error = new DatabaseError(
        'userdb-123',
        'Security failed',
        ErrorCode.DATABASE_SECURITY_FAILED
      )

      expect(error.code).toBe(ErrorCode.DATABASE_SECURITY_FAILED)
    })
  })

  describe('ConnectionError', () => {
    test('creates error with connection category', () => {
      const error = new ConnectionError('Connection timeout')

      expect(error.code).toBe(ErrorCode.CONNECTION_FAILED)
      expect(error.category).toBe(ErrorCategory.CONNECTION)
      expect(error.name).toBe('ConnectionError')
    })
  })

  describe('isApiError', () => {
    test('returns true for ApiError instances', () => {
      const error = new ApiError(
        'Test',
        ErrorCode.UNKNOWN_ERROR,
        ErrorCategory.VALIDATION
      )

      expect(isApiError(error)).toBe(true)
    })

    test('returns true for ApiError subclasses', () => {
      expect(isApiError(new UserCreationError('uuid', 'msg'))).toBe(true)
      expect(isApiError(new DatabaseError('db', 'msg'))).toBe(true)
      expect(isApiError(new ConnectionError('msg'))).toBe(true)
    })

    test('returns false for standard errors', () => {
      expect(isApiError(new Error('test'))).toBe(false)
    })

    test('returns false for non-errors', () => {
      expect(isApiError('string')).toBe(false)
      expect(isApiError(null)).toBe(false)
      expect(isApiError(undefined)).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    test('extracts message from Error', () => {
      const error = new Error('Test message')

      expect(getErrorMessage(error)).toBe('Test message')
    })

    test('converts non-Error to string', () => {
      expect(getErrorMessage('string error')).toBe('string error')
      expect(getErrorMessage(123)).toBe('123')
      expect(getErrorMessage({key: 'value'})).toBe('[object Object]')
    })
  })
})
