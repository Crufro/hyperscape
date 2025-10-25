/**
 * Network Configuration Constants
 */

export const DEFAULT_API_URL = 'http://localhost:3001'
export const DEFAULT_CDN_URL = 'http://localhost:3001/cdn'

export const NETWORK_TIMEOUTS = {
  DEFAULT: 30000,
  UPLOAD: 60000,
  GENERATION: 120000,
} as const
