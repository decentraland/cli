import { applyMiddleware, compose, createStore } from 'redux'
import createSagasMiddleware from 'redux-saga'
import { createLogger } from 'redux-logger'
import { createTransactionMiddleware } from 'decentraland-dapps/dist/modules/transaction/middleware'

import { rootReducer } from './reducer'
import { rootSaga } from './sagas'
import { isDevelopment } from './modules/config'

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const sagasMiddleware = createSagasMiddleware()
const transactionMiddleware = createTransactionMiddleware()
const loggerMiddleware = createLogger({
  collapsed: () => true,
  predicate: (_: any, action: any) => isDevelopment() || action.type.includes('Failure')
})

const middleware = applyMiddleware(loggerMiddleware, transactionMiddleware, sagasMiddleware)

const enhancer = composeEnhancers(middleware)
const store = createStore(rootReducer, enhancer)

sagasMiddleware.run(rootSaga)

export { store }
