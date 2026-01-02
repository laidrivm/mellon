/**
 * Custom Error Types for API Layer
 * Provides structured error handling with error codes and categories
 */

export enum ErrorCode {
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  DATABASE_CREATION_FAILED = 'DATABASE_CREATION_FAILED',
  DATABASE_SECURITY_FAILED = 'DATABASE_SECURITY_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorCategory {
  USER = 'USER',
  DATABASE = 'DATABASE',
  CONNECTION = 'CONNECTION',
  VALIDATION = 'VALIDATION'
}

/**
 * Base API Error class with structured error information
 */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly category: ErrorCategory
  readonly cause?: Error

  constructor(
    message: string,
    code: ErrorCode,
    category: ErrorCategory,
    cause?: Error
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.category = category
    this.cause = cause
  }
}

/**
 * User-related errors
 */
export class UserCreationError extends ApiError {
  readonly uuid: string

  constructor(uuid: string, message: string, cause?: Error) {
    super(message, ErrorCode.USER_CREATION_FAILED, ErrorCategory.USER, cause)
    this.name = 'UserCreationError'
    this.uuid = uuid
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends ApiError {
  readonly dbName: string

  constructor(
    dbName: string,
    message: string,
    code: ErrorCode = ErrorCode.DATABASE_CREATION_FAILED,
    cause?: Error
  ) {
    super(message, code, ErrorCategory.DATABASE, cause)
    this.name = 'DatabaseError'
    this.dbName = dbName
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends ApiError {
  constructor(message: string, cause?: Error) {
    super(message, ErrorCode.CONNECTION_FAILED, ErrorCategory.CONNECTION, cause)
    this.name = 'ConnectionError'
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
