import { RootState } from '../../types'
import { ConfigState } from './types'

export const getState: (state: RootState) => ConfigState = state => state.config
export const getData: (state: RootState) => ConfigState['data'] = state => getState(state).data
