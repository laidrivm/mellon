/**
 * CouchDB Client Types
 * Provides interface for dependency injection in tests
 */

import nano, {type ServerScope} from 'nano'
import {getCouchDbConfig} from './config.ts'

/**
 * CouchDB client interface for dependency injection
 */
export interface CouchClient {
  readonly server: ServerScope
}

/**
 * Create CouchDB client from environment config
 */
export function createCouchClient(): CouchClient {
  const config = getCouchDbConfig()
  return {server: nano(config.url)}
}
