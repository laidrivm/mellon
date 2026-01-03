/**
 * Password Generation Module
 * Provides cryptographically secure password generation
 */

import {PASSWORD_CONSTANTS} from './config.ts'

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
