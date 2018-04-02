import { env } from 'decentraland-commons'

env.load()

/**
 * Check if CLI is used in development mode.
 */
export const isDev: boolean = process.env.NODE_ENV === 'dev'
