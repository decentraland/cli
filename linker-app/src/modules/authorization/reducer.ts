import { Reducer } from 'redux'
import {
  loadingReducer,
  LoadingState
} from 'decentraland-dapps/dist/modules/loading/reducer'

import {
  FetchAuthorizationsRequestAction,
  FetchAuthorizationsSuccessAction,
  FetchAuthorizationsFailureAction,
  FETCH_AUTHORIZATIONS_REQUEST,
  FETCH_AUTHORIZATIONS_SUCCESS,
  FETCH_AUTHORIZATIONS_FAILURE
} from './actions'

export type AuthorizationState = {
  data: any
  loading: LoadingState
  error: string | null
}

const INITIAL_STATE: AuthorizationState = {
  data: {},
  loading: [],
  error: null
}

export type AuthorizationReducerAction =
  | FetchAuthorizationsRequestAction
  | FetchAuthorizationsSuccessAction
  | FetchAuthorizationsFailureAction

export const authorizationReducer: Reducer<AuthorizationState> = (
  state = INITIAL_STATE,
  action: AuthorizationReducerAction
): AuthorizationState => {
  switch (action.type) {
    case FETCH_AUTHORIZATIONS_REQUEST:
      return {
        ...state,
        loading: loadingReducer(state.loading, action)
      }
    case FETCH_AUTHORIZATIONS_SUCCESS:
      return {
        loading: loadingReducer(state.loading, action),
        data: action.payload.authorizations,
        error: null
      }
    case FETCH_AUTHORIZATIONS_FAILURE:
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
