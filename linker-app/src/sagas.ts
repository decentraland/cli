import { all } from 'redux-saga/effects'
import { eth } from 'decentraland-eth'
import { createWalletSaga } from 'decentraland-dapps/dist/modules/wallet/sagas'
import { transactionSaga } from 'decentraland-dapps/dist/modules/transaction/sagas'

import { MANAToken, LANDRegistry } from './contracts'
import { isDevelopment } from './modules/config'
import { landSaga } from './modules/land/sagas'

const walletSaga = createWalletSaga({
  provider: isDevelopment() ? 'https://ropsten.infura.io' : 'https://mainnet.infura.io',
  contracts: [MANAToken, LANDRegistry],
  eth
})

export function* rootSaga() {
  yield all([walletSaga(), transactionSaga(), landSaga()])
}
