import { all } from 'redux-saga/effects'
import { eth } from 'decentraland-eth'
import { createWalletSaga } from 'decentraland-dapps/dist/modules/wallet/sagas'

import { landSaga } from './modules/land/sagas'
import { signatureSaga } from './modules/signature/sagas'
import { authorizationSaga } from './modules/authorization/sagas'

import { getManaContract, getLandContract, getEstateContract } from './contracts'

export function rootSaga() {
  const walletSaga = createWalletSaga({
    provider: global['web3'].currentProvider,
    contracts: [getManaContract(), getLandContract(), getEstateContract()],
    eth
  })

  return function*() {
    yield all([walletSaga(), landSaga(), signatureSaga(), authorizationSaga()])
  }
}
