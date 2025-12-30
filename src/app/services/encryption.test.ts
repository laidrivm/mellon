import {describe, expect, mock, test} from 'bun:test'

// Mock pouchDB to avoid database operations
mock.module('./pouchDB.ts', () => ({
  localUserDB: {
    get: mock(() => Promise.reject({name: 'not_found'})),
    put: mock(() => Promise.resolve({ok: true}))
  }
}))

// Mock secrets to avoid circular dependency
mock.module('./secrets.ts', () => ({
  recryptSecrets: mock(() => Promise.resolve(true))
}))

const {
  dateToSalt,
  encryptField,
  decryptField,
  deriveKeyFromPassword,
  clearEncryptionCache
} = await import('./encryption.ts')

describe('encryption', () => {
  describe('dateToSalt', () => {
    test('generates consistent salt from same date', async () => {
      const date = '2024-12-11T10:30:45.123Z'
      const salt1 = await dateToSalt(date)
      const salt2 = await dateToSalt(date)

      expect(salt1).toEqual(salt2)
      expect(salt1.length).toBe(32)
    })

    test('generates different salts for different dates', async () => {
      const salt1 = await dateToSalt('2024-12-11T10:30:45.123Z')
      const salt2 = await dateToSalt('2024-12-12T10:30:45.123Z')

      expect(salt1).not.toEqual(salt2)
    })

    test('supports custom salt length', async () => {
      const salt16 = await dateToSalt('2024-12-11T10:30:45.123Z', 16)
      const salt64 = await dateToSalt('2024-12-11T10:30:45.123Z', 64)

      expect(salt16.length).toBe(16)
      expect(salt64.length).toBe(64)
    })
  })

  describe('encryptField/decryptField', () => {
    test('encrypts and decrypts data correctly', async () => {
      const key = await crypto.subtle.generateKey(
        {name: 'AES-GCM', length: 256},
        true,
        ['encrypt', 'decrypt']
      )
      const originalData = 'my secret password 123!'

      const encrypted = await encryptField(originalData, key)
      const decrypted = await decryptField(encrypted, key)

      expect(decrypted).toBe(originalData)
      expect(encrypted).not.toBe(originalData)
    })

    test('produces different ciphertext for same plaintext (random IV)', async () => {
      const key = await crypto.subtle.generateKey(
        {name: 'AES-GCM', length: 256},
        true,
        ['encrypt', 'decrypt']
      )
      const data = 'test data'

      const encrypted1 = await encryptField(data, key)
      const encrypted2 = await encryptField(data, key)

      expect(encrypted1).not.toBe(encrypted2)
    })

    test('handles unicode and special characters', async () => {
      const key = await crypto.subtle.generateKey(
        {name: 'AES-GCM', length: 256},
        true,
        ['encrypt', 'decrypt']
      )
      const originalData = '密码 пароль 🔐'

      const encrypted = await encryptField(originalData, key)
      const decrypted = await decryptField(encrypted, key)

      expect(decrypted).toBe(originalData)
    })
  })

  describe('deriveKeyFromPassword', () => {
    test('derives consistent key from same password and salt', async () => {
      const salt = await dateToSalt('2024-12-11T10:30:45.123Z')

      const key1 = await deriveKeyFromPassword('test-password', salt)
      const key2 = await deriveKeyFromPassword('test-password', salt)

      const raw1 = await crypto.subtle.exportKey('raw', key1)
      const raw2 = await crypto.subtle.exportKey('raw', key2)

      expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2))
    })

    test('derives different keys for different passwords', async () => {
      const salt = await dateToSalt('2024-12-11T10:30:45.123Z')

      const key1 = await deriveKeyFromPassword('password1', salt)
      const key2 = await deriveKeyFromPassword('password2', salt)

      const raw1 = await crypto.subtle.exportKey('raw', key1)
      const raw2 = await crypto.subtle.exportKey('raw', key2)

      expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2))
    })
  })

  describe('clearEncryptionCache', () => {
    test('clears cache without error', () => {
      expect(() => clearEncryptionCache()).not.toThrow()
    })
  })
})
