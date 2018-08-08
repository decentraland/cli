export const FETCH_CONFIG_REQUEST = '[Request] Fetch Config'
export const FETCH_CONFIG_SUCCESS = '[Success] Fetch Config'
export const FETCH_CONFIG_FAILURE = '[Failure] Fetch Config'

export interface Config {
  isDev: boolean
}

export type ConfigState = {
  data: Config
  error: string
}
