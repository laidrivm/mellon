/**
 * CouchDB Client Module
 * Provides a configurable CouchDB client with dependency injection support
 */

import nano, {type ServerScope} from 'nano'
import {type CouchDbConfig, getCouchDbConfig} from './config.ts'

/**
 * CouchDB client interface for dependency injection
 */
export interface CouchClient {
  readonly server: ServerScope
  readonly config: CouchDbConfig
}

/**
 * Create a new CouchDB client instance
 */
export function createCouchClient(config?: CouchDbConfig): CouchClient {
  const resolvedConfig = config ?? getCouchDbConfig()
  const server = nano(resolvedConfig.url)

  return {
    server,
    config: resolvedConfig
  }
}

/**
 * Default CouchDB client instance
 * Used when no client is explicitly provided
 */
let defaultClient: CouchClient | null = null

/**
 * Get the default CouchDB client (singleton pattern)
 */
export function getDefaultCouchClient(): CouchClient {
  if (!defaultClient) {
    defaultClient = createCouchClient()
  }
  return defaultClient
}

/**
 * Reset the default client (useful for testing)
 */
export function resetDefaultCouchClient(): void {
  defaultClient = null
}
