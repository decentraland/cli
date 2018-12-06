import { getOrElse } from '.'

/**
 * Check if CLI is used in development mode.
 */
export const isDev: boolean = process.env.DCL_ENV === 'dev'

export function getProvider() {
  return isDev ? 'https://ropsten.infura.io/' : 'https://mainnet.infura.io/'
}

export function isEnvCi(): boolean {
  return getOrElse(process.env.CI, false)
}
