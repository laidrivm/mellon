import {beforeEach, describe, expect, mock, test} from 'bun:test'
import {generateUUID} from './generate-uuid.ts'

// Mock the couchDB module
mock.module('./couchDB.ts', () => ({
  createCouchDbUser: mock(),
  createUserRelatedCouchDb: mock()
}))

// Import mocked functions after mock.module
const {createCouchDbUser, createUserRelatedCouchDb} = await import(
  './couchDB.ts'
)

describe('generateUUID', () => {
  beforeEach(() => {
    ;(createCouchDbUser as ReturnType<typeof mock>).mockClear()
    ;(createUserRelatedCouchDb as ReturnType<typeof mock>).mockClear()
  })

  test('returns success response when user and db creation succeed', async () => {
    // Arrange
    const mockUser = {success: true, uuid: 'test-uuid', password: 'test-pass'}
    const mockDb = {success: true, db: 'userdb-test-uuid'}
    ;(createCouchDbUser as ReturnType<typeof mock>).mockResolvedValue(mockUser)
    ;(createUserRelatedCouchDb as ReturnType<typeof mock>).mockResolvedValue(
      mockDb
    )

    // Act
    const result = await generateUUID()

    // Assert
    expect(result.success).toBe(true)
    expect(result.message).toBe('User created successfully')
    expect(result.data).toMatchObject({
      ...mockUser,
      ...mockDb,
      success: true
    })
    expect(createCouchDbUser).toHaveBeenCalled()
    expect(createUserRelatedCouchDb).toHaveBeenCalled()
  })

  test('returns error response when an exception is thrown', async () => {
    // Arrange
    const errorMessage = 'Database connection failed'
    ;(createCouchDbUser as ReturnType<typeof mock>).mockRejectedValue(
      new Error(errorMessage)
    )

    // Act
    const result = await generateUUID()

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
    expect(result.message).toBe('Failed to generate UUID or create user')
  })
})
