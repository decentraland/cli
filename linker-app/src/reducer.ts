import { combineReducers } from 'redux'
import { walletReducer as wallet } from 'decentraland-dapps/dist/modules/wallet/reducer'
import { transactionReducer as transaction } from 'decentraland-dapps/dist/modules/transaction/reducer'

import { RootState } from './types'
import { landReducer as land } from './modules/land/reducer'

export const rootReducer = combineReducers<RootState>({ wallet, transaction, land })
