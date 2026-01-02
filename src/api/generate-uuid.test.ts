import {describe, expect, test} from 'bun:test'
import {ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import type {DatabaseCreationResult} from './database-repository.ts'
import {
  generateUUID,
  type UserService,
  type UuidGenerator
} from './generate-uuid.ts'
import type {UserCreationResult} from './user-repository.ts'

describe('generateUUID', () => {
  const mockUuid = 'test-uuid-12345'

  const mockUuidGenerator: UuidGenerator = {
    generate: () => mockUuid
  }

  test('returns success response when user and db creation succeed', async () => {
    const mockUser: UserCreationResult = {
      success: true,
      uuid: mockUuid,
      password: 'secure-password-123',
      message: SUCCESS_MESSAGES.USER_CREATED
    }

    const mockDb: DatabaseCreationResult = {
      success: true,
      db: `userdb-${mockUuid}`,
      message: SUCCESS_MESSAGES.DB_CREATED
    }

    const mockUserService: UserService = {
      createUser: async () => mockUser,
      createDatabase: async () => mockDb
    }

    const result = await generateUUID({
      uuidGenerator: mockUuidGenerator,
      userService: mockUserService
    })

    expect(result.success).toBe(true)
    expect(result.message).toBe(SUCCESS_MESSAGES.USER_CREATED)
    expect(result.data).toMatchObject({
      success: true,
      uuid: mockUuid,
      password: mockUser.password,
      db: mockDb.db
    })
  })

  test('returns error response when user creation throws', async () => {
    const errorMessage = 'Database connection failed'

    const mockUserService: UserService = {
      createUser: async () => {
        throw new Error(errorMessage)
      },
      createDatabase: async () => ({
        success: true,
        db: `userdb-${mockUuid}`,
        message: SUCCESS_MESSAGES.DB_CREATED
      })
    }

    const result = await generateUUID({
      uuidGenerator: mockUuidGenerator,
      userService: mockUserService
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
    expect(result.message).toBe(ERROR_MESSAGES.UUID_GENERATION_ERROR)
  })

  test('returns error response when database creation throws', async () => {
    const errorMessage = 'Database creation failed'

    const mockUserService: UserService = {
      createUser: async () => ({
        success: true,
        uuid: mockUuid,
        password: 'test-pass',
        message: SUCCESS_MESSAGES.USER_CREATED
      }),
      createDatabase: async () => {
        throw new Error(errorMessage)
      }
    }

    const result = await generateUUID({
      uuidGenerator: mockUuidGenerator,
      userService: mockUserService
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
    expect(result.message).toBe(ERROR_MESSAGES.UUID_GENERATION_ERROR)
  })

  test('uses provided UUID generator', async () => {
    const customUuid = 'custom-uuid-99999'
    const customGenerator: UuidGenerator = {
      generate: () => customUuid
    }

    const mockUserService: UserService = {
      createUser: async (uuid) => ({
        success: true,
        uuid,
        password: 'test-pass',
        message: SUCCESS_MESSAGES.USER_CREATED
      }),
      createDatabase: async (uuid) => ({
        success: true,
        db: `userdb-${uuid}`,
        message: SUCCESS_MESSAGES.DB_CREATED
      })
    }

    const result = await generateUUID({
      uuidGenerator: customGenerator,
      userService: mockUserService
    })

    expect(result.success).toBe(true)
    expect(result.data?.uuid).toBe(customUuid)
  })
})
