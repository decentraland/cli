// We have to define this variable until ledgerjs fix this issue:
// https://github.com/LedgerHQ/ledgerjs/issues/258 wich is a dependency
// of decentraland-eth
global['regeneratorRuntime'] = require('@babel/runtime/regenerator')

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import WalletProvider from 'decentraland-dapps/dist/providers/WalletProvider'

import LinkerPage from './components/LinkerPage'
import { store } from './store'

ReactDOM.render(
  <Provider store={store}>
    <WalletProvider>
      <LinkerPage />
    </WalletProvider>
  </Provider>,
  document.getElementById('main')
)
