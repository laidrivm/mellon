/**
 * Password Generation Module
 * Provides cryptographically secure password generation
 */

import {PASSWORD_CONSTANTS} from './config.ts'

/**
 * Password generator interface for dependency injection
 */
export interface PasswordGenerator {
  generate(length?: number): string
}

/**
 * Generate a cryptographically secure random password
 * Uses Web Crypto API for true randomness
 */
export function generateSecurePassword(
  length: number = PASSWORD_CONSTANTS.LENGTH
): string {
  const charset = PASSWORD_CONSTANTS.CHARSET
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)

  return Array.from(randomValues)
    .map((value) => charset[value % charset.length])
    .join('')
}

/**
 * Default password generator implementation
 * Can be replaced in tests with a mock
 */
export const defaultPasswordGenerator: PasswordGenerator = {
  generate: generateSecurePassword
}
