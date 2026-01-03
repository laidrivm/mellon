import {beforeEach, describe, expect, mock, test} from 'bun:test'
import {ERROR_MESSAGES, SUCCESS_MESSAGES} from './config.ts'

mock.module('./user-repository.ts', () => ({
  createCouchDbUser: mock()
}))

mock.module('./database-repository.ts', () => ({
  createUserDatabase: mock(),
  getUserDbName: (uuid: string) => `userdb-${uuid}`
}))

const {createCouchDbUser} = await import('./user-repository.ts')
const {createUserDatabase} = await import('./database-repository.ts')
const {generateUUID} = await import('./generate-uuid.ts')

describe('generateUUID', () => {
  beforeEach(() => {
    ;(createCouchDbUser as ReturnType<typeof mock>).mockClear()
    ;(createUserDatabase as ReturnType<typeof mock>).mockClear()
  })

  test('returns success response when user and db creation succeed', async () => {
    const mockUser = {
      success: true,
      uuid: 'test-uuid',
      password: 'test-pass',
      message: SUCCESS_MESSAGES.USER_CREATED
    }
    const mockDb = {
      success: true,
      db: 'userdb-test-uuid',
      message: SUCCESS_MESSAGES.DB_CREATED
    }

    ;(createCouchDbUser as ReturnType<typeof mock>).mockResolvedValue(mockUser)
    ;(createUserDatabase as ReturnType<typeof mock>).mockResolvedValue(mockDb)

    const result = await generateUUID()

    expect(result.success).toBe(true)
    expect(result.message).toBe(SUCCESS_MESSAGES.USER_CREATED)
    expect(result.data?.uuid).toBe(mockUser.uuid)
    expect(result.data?.password).toBe(mockUser.password)
    expect(result.data?.db).toBe(mockDb.db)
    expect(createCouchDbUser).toHaveBeenCalled()
    expect(createUserDatabase).toHaveBeenCalled()
  })

  test('returns error response when user creation throws', async () => {
    const errorMessage = 'Database connection failed'
    ;(createCouchDbUser as ReturnType<typeof mock>).mockRejectedValue(
      new Error(errorMessage)
    )

    const result = await generateUUID()

    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
    expect(result.message).toBe(ERROR_MESSAGES.UUID_GENERATION_ERROR)
  })

  test('returns error response when database creation throws', async () => {
    const errorMessage = 'Database creation failed'
    ;(createCouchDbUser as ReturnType<typeof mock>).mockResolvedValue({
      success: true,
      uuid: 'test-uuid',
      password: 'test-pass',
      message: SUCCESS_MESSAGES.USER_CREATED
    })
    ;(createUserDatabase as ReturnType<typeof mock>).mockRejectedValue(
      new Error(errorMessage)
    )

    const result = await generateUUID()

    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
    expect(result.message).toBe(ERROR_MESSAGES.UUID_GENERATION_ERROR)
  })
})
