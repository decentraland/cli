import { MiddlewareAPI, AnyAction, Reducer, Store } from 'redux'
import { WalletState, WalletReducerAction } from 'decentraland-dapps/dist/modules/wallet/reducer'

import { ConfigState, ConfigReducerAction } from './modules/config/reducer'

export type RootState = {
  config: ConfigState
  wallet: WalletState
}

export type RootAction = ConfigReducerAction | WalletReducerAction

export type RootStore = Store<RootState>

export interface RootDispatch<A = RootAction> {
  (action: A): A
}

export type RootMiddleware = (store: MiddlewareAPI<any>) => (next: RootDispatch<AnyAction>) => (action: AnyAction) => any

export type RootReducer = Reducer<RootState>
