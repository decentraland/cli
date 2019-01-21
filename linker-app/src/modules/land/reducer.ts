import { Reducer } from 'redux'
import { loadingReducer, LoadingState } from 'decentraland-dapps/dist/modules/loading/reducer'

import {
  FetchLandRequestAction,
  FetchLandSuccessAction,
  FetchLandFailureAction,
  FETCH_LAND_REQUEST,
  FETCH_LAND_FAILURE,
  FETCH_LAND_SUCCESS
} from './actions'

export type LandState = {
  data: any
  loading: LoadingState
  error: string | null
}

const INITIAL_STATE: LandState = {
  data: {},
  loading: [],
  error: null
}

export type LandReducerAction =
  | FetchLandRequestAction
  | FetchLandSuccessAction
  | FetchLandFailureAction

export const landReducer: Reducer<LandState> = (
  state = INITIAL_STATE,
  action: LandReducerAction
): LandState => {
  switch (action.type) {
    case FETCH_LAND_REQUEST:
      return {
        ...state,
        loading: loadingReducer(state.loading, action)
      }
    case FETCH_LAND_SUCCESS:
      return {
        loading: loadingReducer(state.loading, action),
        data: action.payload.land,
        error: null
      }
    case FETCH_LAND_FAILURE:
      return {
        ...state,
        loading: loadingReducer(state.loading, action),
        error: action.payload.error
      }
    default: {
      return state
    }
  }
}
