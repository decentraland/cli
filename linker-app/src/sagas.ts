import { all } from 'redux-saga/effects'
import { eth } from 'decentraland-eth'
import { createWalletSaga } from 'decentraland-dapps/dist/modules/wallet/sagas'
import { transactionSaga } from 'decentraland-dapps/dist/modules/transaction/sagas'

import { landSaga } from './modules/land/sagas'
import { signatureSaga } from './modules/signature/sagas'
import { authorizationSaga } from './modules/authorization/sagas'

import { MANAToken, LANDRegistry } from './contracts'
import { provider } from './config'

const walletSaga = createWalletSaga({
  provider,
  contracts: [MANAToken, LANDRegistry],
  eth
})

export function* rootSaga() {
  yield all([
    walletSaga(),
    transactionSaga(),
    landSaga(),
    signatureSaga(),
    authorizationSaga()
  ])
}
