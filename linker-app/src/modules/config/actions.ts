import { action, ActionType } from 'typesafe-actions'
import { Config } from './types'

export const FETCH_CONFIG_REQUEST = '[Request] Fetch Config'
export const FETCH_CONFIG_SUCCESS = '[Success] Fetch Config'
export const FETCH_CONFIG_FAILURE = '[Failure] Fetch Config'

export const fetchConfigRequest = () => action(FETCH_CONFIG_REQUEST, {})
export const fetchConfigSuccess = (config: Config) => action(FETCH_CONFIG_SUCCESS, { config })
export const fetchConfigFailure = (error: string) => action(FETCH_CONFIG_FAILURE, { error })

export type FetchConfigRequestAction = ActionType<typeof fetchConfigRequest>
export type FetchConfigSuccessAction = ActionType<typeof fetchConfigSuccess>
export type FetchConfigFailureAction = ActionType<typeof fetchConfigFailure>
