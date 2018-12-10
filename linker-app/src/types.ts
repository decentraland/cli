import { MiddlewareAPI, AnyAction, Reducer, Store } from 'redux'
import { WalletState } from 'decentraland-dapps/dist/modules/wallet/reducer'
import { TransactionState } from 'decentraland-dapps/dist/modules/transaction/reducer'

import { LandState } from './modules/land/reducer'
import { SignatureState } from './modules/signature/reducer'

export type RootState = {
  wallet: WalletState
  transaction: TransactionState
  land: LandState
  signature: SignatureState
}

export type RootStore = Store<RootState>

export interface RootDispatch<A = AnyAction> {
  (action: A): A
}

export type RootMiddleware = (store: MiddlewareAPI<any>) => (next: RootDispatch<AnyAction>) => (action: AnyAction) => any

export type RootReducer = Reducer<RootState>
