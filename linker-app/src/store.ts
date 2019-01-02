import { applyMiddleware, compose, createStore } from 'redux'
import createSagasMiddleware from 'redux-saga'
import { createLogger } from 'redux-logger'
import { createTransactionMiddleware } from 'decentraland-dapps/dist/modules/transaction/middleware'
import { createStorageMiddleware } from 'decentraland-dapps/dist/modules/storage/middleware'

import { rootReducer } from './reducer'
import { rootSaga } from './sagas'
import { isDevelopment } from './config'

const composeEnhancers =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const { storageMiddleware, loadStorageMiddleware } = createStorageMiddleware({
  storageKey: 'decentraland-cli'
})
const sagasMiddleware = createSagasMiddleware()
const transactionMiddleware = createTransactionMiddleware()
const loggerMiddleware = createLogger({
  collapsed: () => true,
  predicate: (_: any, action: any) =>
    isDevelopment() || action.type.includes('Failure')
})

const middleware = applyMiddleware(
  loggerMiddleware,
  storageMiddleware,
  transactionMiddleware,
  sagasMiddleware
)

const enhancer = composeEnhancers(middleware)
const store = createStore(rootReducer, enhancer)

loadStorageMiddleware(store)
sagasMiddleware.run(rootSaga)

export { store }
