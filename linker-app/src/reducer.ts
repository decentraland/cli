import { combineReducers } from 'redux'
import { walletReducer as wallet } from 'decentraland-dapps/dist/modules/wallet/reducer'

import { RootState } from './types'
import { configReducer as config } from 'src/modules/config/reducer'

export const rootReducer = combineReducers<RootState>({ config, wallet })
