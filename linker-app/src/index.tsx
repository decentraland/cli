// We have to define this variable until ledgerjs fix this issue:
// https://github.com/LedgerHQ/ledgerjs/issues/258 wich is a dependency
// of decentraland-eth
global['regeneratorRuntime'] = require('@babel/runtime/regenerator')

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import WalletProvider from 'decentraland-dapps/dist/providers/WalletProvider'

import LinkerPage from './components/LinkerPage'
import { setNetwork } from './config'

function getNetwork() {
  return new Promise((resolve, reject) => {
    global['web3'].version.getNetwork((err, netId) => {
      if (err) {
        reject(err)
      }
      resolve(netId)
    })
  })
}

;(async () => {
  const net = await getNetwork()
  setNetwork(net === '1' ? 'mainnet' : 'ropsten')
  const { store } = await import('./store')
  ReactDOM.render(
    <Provider store={store}>
      <WalletProvider>
        <LinkerPage />
      </WalletProvider>
    </Provider>,
    document.getElementById('main')
  )
})()
