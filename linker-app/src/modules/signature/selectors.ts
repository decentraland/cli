import { RootState } from '../../types'
import { SignatureState } from './reducer'

export const getState: (state: RootState) => SignatureState = state => state.signature
export const getData: (state: RootState) => SignatureState['data'] = state => getState(state).data
export const isLoading: (state: RootState) => boolean = state => getState(state).loading.length > 0
export const getError: (state: RootState) => SignatureState['error'] = state => getState(state).error
