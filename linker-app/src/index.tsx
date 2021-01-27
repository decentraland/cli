import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import WalletProvider from 'decentraland-dapps/dist/providers/WalletProvider'

import LinkerPage from './components/LinkerPage'
import { setNetwork } from './config'

function getNetwork() {
  return new Promise((resolve, reject) => {
    if (window.ethereum && 'chainId' in window.ethereum) {
      resolve((window.ethereum as any).chainId)
    } else {
      reject('No network detected')
    }
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
