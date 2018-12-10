import { Reducer } from 'redux'
import { loadingReducer, LoadingState } from 'decentraland-dapps/dist/modules/loading/reducer'

import {
  SignContentRequestAction,
  SignContentSuccessAction,
  SignContentFailureAction,
  SIGN_CONTENT_REQUEST,
  SIGN_CONTENT_SUCCESS,
  SIGN_CONTENT_FAILURE
} from './actions'

export type SignatureState = { data: any; loading: LoadingState; error: string | null }

const INITIAL_STATE: SignatureState = {
  data: {},
  loading: [],
  error: null
}

export type SignatureReducerAction = SignContentRequestAction | SignContentSuccessAction | SignContentFailureAction

export const signatureReducer: Reducer<SignatureState> = (state = INITIAL_STATE, action: SignatureReducerAction): SignatureState => {
  switch (action.type) {
    case SIGN_CONTENT_REQUEST:
      return {
        ...state,
        loading: loadingReducer(state.loading, action)
      }
    case SIGN_CONTENT_SUCCESS:
      return {
        loading: loadingReducer(state.loading, action),
        data: action.payload.signature,
        error: null
      }
    case SIGN_CONTENT_FAILURE:
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
