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
    if (window.ethereum) {
      const id = (window.ethereum as any).chainId
      if (id){
        return resolve(id)
      }
    }
    reject('No network detected')
  })
}

;(async () => {
  const net = await getNetwork()
  setNetwork(net === '0x1' ? 'mainnet' : 'ropsten')
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
