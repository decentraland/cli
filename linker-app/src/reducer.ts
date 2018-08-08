import { combineReducers } from 'redux'

import { RootState } from './types'
import { configReducer as config } from 'src/modules/config/reducer'

export const rootReducer = combineReducers<RootState>({ config })
