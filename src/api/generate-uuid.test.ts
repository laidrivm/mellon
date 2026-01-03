import {describe, expect, test} from 'bun:test'
import {ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'
import {generateUUID, type UserService} from './generate-uuid.ts'

describe('generateUUID', () => {
  test('returns success response when user and db creation succeed', async () => {
    let capturedUuid = ''

    const mockUserService: UserService = {
      createUser: async (uuid) => {
        capturedUuid = uuid
        return {
          success: true,
          uuid,
          password: 'secure-password-123',
          message: SUCCESS_MESSAGES.USER_CREATED
        }
      },
      createDatabase: async (uuid) => ({
        success: true,
        db: `userdb-${uuid}`,
        message: SUCCESS_MESSAGES.DB_CREATED
      })
    }

    const result = await generateUUID({userService: mockUserService})

    expect(result.success).toBe(true)
    expect(result.message).toBe(SUCCESS_MESSAGES.USER_CREATED)
    expect(result.data?.uuid).toBe(capturedUuid)
    expect(result.data?.password).toBe('secure-password-123')
  })

  test('returns error response when user creation throws', async () => {
    const errorMessage = 'Database connection failed'

    const mockUserService: UserService = {
      createUser: async () => {
        throw new Error(errorMessage)
      },
      createDatabase: async () => ({
        success: true,
        db: 'userdb-test',
        message: SUCCESS_MESSAGES.DB_CREATED
      })
    }

    const result = await generateUUID({userService: mockUserService})

    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
    expect(result.message).toBe(ERROR_MESSAGES.UUID_GENERATION_ERROR)
  })

  test('returns error response when database creation throws', async () => {
    const errorMessage = 'Database creation failed'

    const mockUserService: UserService = {
      createUser: async (uuid) => ({
        success: true,
        uuid,
        password: 'test-pass',
        message: SUCCESS_MESSAGES.USER_CREATED
      }),
      createDatabase: async () => {
        throw new Error(errorMessage)
      }
    }

    const result = await generateUUID({userService: mockUserService})

    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
    expect(result.message).toBe(ERROR_MESSAGES.UUID_GENERATION_ERROR)
  })
})
