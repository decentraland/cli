import { all } from 'redux-saga/effects'
import { eth } from 'decentraland-eth'
import { createWalletSaga } from 'decentraland-dapps/dist/modules/wallet/sagas'

import { MANAToken } from './contracts'
import { configSaga } from './modules/config/sagas'

const walletSaga = createWalletSaga({
  provider: 'https://ropsten.infura.io',
  contracts: [MANAToken],
  eth
})

export function* rootSaga() {
  yield all([configSaga(), walletSaga()])
}
