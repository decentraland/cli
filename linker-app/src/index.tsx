import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import LinkerPage from './components/LinkerPage'
import { store } from './store'

ReactDOM.render(
  <Provider store={store}>
    <LinkerPage />
  </Provider>,
  document.getElementById('main')
)
