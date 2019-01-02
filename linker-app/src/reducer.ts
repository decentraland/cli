import { combineReducers } from 'redux'
import { walletReducer as wallet } from 'decentraland-dapps/dist/modules/wallet/reducer'
import { transactionReducer as transaction } from 'decentraland-dapps/dist/modules/transaction/reducer'

import { landReducer as land } from './modules/land/reducer'
import { signatureReducer as signature } from './modules/signature/reducer'
import { authorizationReducer as authorization } from './modules/authorization/reducer'
import { RootState } from './types'

export const rootReducer = combineReducers<RootState>({
  wallet,
  transaction,
  land,
  signature,
  authorization
})
