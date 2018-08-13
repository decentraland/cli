import { RootState } from '../../types'
import { LandState } from './reducer'

export const getState: (state: RootState) => LandState = state => state.land
export const getData: (state: RootState) => LandState['data'] = state => getState(state).data
export const isLoading: (state: RootState) => boolean = state => getState(state).loading.length > 0
export const getError: (state: RootState) => LandState['error'] = state => getState(state).error
