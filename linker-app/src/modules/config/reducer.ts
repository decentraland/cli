import { Reducer } from 'redux'

import { Config } from './types'
import {
  FetchConfigRequestAction,
  FetchConfigSuccessAction,
  FetchConfigFailureAction,
  FETCH_CONFIG_REQUEST,
  FETCH_CONFIG_SUCCESS,
  FETCH_CONFIG_FAILURE
} from './actions'

export type ConfigState = {
  data: Config
  error: string
}

const INITIAL_STATE: ConfigState = {
  data: { isDev: false },
  error: null
}

export type ConfigReducerAction = FetchConfigRequestAction | FetchConfigSuccessAction | FetchConfigFailureAction

export const configReducer: Reducer<ConfigState> = (state = INITIAL_STATE, action: ConfigReducerAction): ConfigState => {
  switch (action.type) {
    case FETCH_CONFIG_REQUEST: {
      return state
    }
    case FETCH_CONFIG_SUCCESS: {
      return {
        ...state,
        data: { ...action.payload.config }
      }
    }
    case FETCH_CONFIG_FAILURE: {
      return {
        ...state,
        error: action.payload.error
      }
    }
    default:
      return state
  }
}
