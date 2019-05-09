import { getOrElse } from '.'

export function isDevelopment() {
  return process.env.NODE_ENV !== 'production'
}

export function isDebug() {
  return !!process.env.DEBUG
}

export const isDev: boolean = process.env.DCL_ENV === 'dev'
export function getProvider() {
  return isDev ? 'https://ropsten.infura.io/' : 'https://mainnet.infura.io/'
}

export function isEnvCi(): boolean {
  return getOrElse(process.env.CI, false)
}
