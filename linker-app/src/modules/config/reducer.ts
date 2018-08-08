import { Reducer } from 'redux'

import { ConfigState, FETCH_CONFIG_REQUEST, FETCH_CONFIG_SUCCESS, FETCH_CONFIG_FAILURE } from './types'
import { ConfigAction } from './actions'

const INITIAL_STATE: ConfigState = {
  data: { isDev: false },
  error: null
}

export const configReducer: Reducer<ConfigState> = (state = INITIAL_STATE, action: ConfigAction): ConfigState => {
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
