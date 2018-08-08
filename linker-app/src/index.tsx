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
