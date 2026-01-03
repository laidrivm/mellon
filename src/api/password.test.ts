import {describe, expect, test} from 'bun:test'
import {PASSWORD_CONSTANTS} from './config.ts'
import {generateSecurePassword} from './password.ts'

describe('generateSecurePassword', () => {
  test('generates password with default length', () => {
    const password = generateSecurePassword()

    expect(password).toHaveLength(PASSWORD_CONSTANTS.LENGTH)
  })

  test('generates password with custom length', () => {
    const customLength = 64
    const password = generateSecurePassword(customLength)

    expect(password).toHaveLength(customLength)
  })

  test('generates different passwords on each call', () => {
    const passwords = new Set<string>()

    for (let i = 0; i < 100; i++) {
      passwords.add(generateSecurePassword())
    }

    expect(passwords.size).toBe(100)
  })

  test('contains only characters from charset', () => {
    const password = generateSecurePassword()
    const charset = PASSWORD_CONSTANTS.CHARSET

    for (const char of password) {
      expect(charset).toContain(char)
    }
  })
})
