import { getOrElse } from '.'

/**
 * Check if CLI is used in development mode.
 */
export const isDev: boolean = process.env.DCL_ENV === 'dev'

export function isEnvCi(): boolean {
  return getOrElse(process.env.NOW, false) || getOrElse(process.env.CI, false)
}
