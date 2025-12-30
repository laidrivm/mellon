import type {Secret} from '../../types.ts'

/**
 * Validate secret data
 * @param {Secret} secret - Secret to validate
 * @returns {boolean} Whether secret is valid
 */
export function validateSecret(secret: Secret): boolean {
  return (
    !!secret &&
    typeof secret.name === 'string' &&
    secret.name.trim().length > 0 &&
    typeof secret.username === 'string' &&
    typeof secret.password === 'string' &&
    secret.password.length > 0
  )
}
