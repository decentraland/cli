import { action, ActionType } from 'typesafe-actions'
import { FETCH_CONFIG_REQUEST, FETCH_CONFIG_SUCCESS, FETCH_CONFIG_FAILURE, Config } from './types'

export const fetchConfigRequest = () => action(FETCH_CONFIG_REQUEST, {})
export const fetchConfigSuccess = (config: Config) => action(FETCH_CONFIG_SUCCESS, { config })
export const fetchConfigFailure = (error: string) => action(FETCH_CONFIG_FAILURE, { error })

const allActions = { fetchConfigRequest, fetchConfigSuccess, fetchConfigFailure }
export type ConfigAction = ActionType<typeof allActions>
