import { MiddlewareAPI, AnyAction, Reducer, Store } from 'redux'
import { WalletState } from 'decentraland-dapps/dist/modules/wallet/reducer'

import { ConfigState } from './modules/config/types'
import { ConfigAction } from './modules/config/actions'

export type RootState = {
  config: ConfigState
  wallet: WalletState
}

export type RootAction = ConfigAction

export type RootStore = Store<RootState>

export interface RootDispatch<A = RootAction> {
  (action: A): A
}

export type RootMiddleware = (store: MiddlewareAPI<any>) => (next: RootDispatch<AnyAction>) => (action: AnyAction) => any

export type RootReducer = Reducer<RootState>
