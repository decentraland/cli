import { applyMiddleware, compose, createStore } from 'redux'
import createSagasMiddleware from 'redux-saga'
import { createLogger } from 'redux-logger'

import { rootReducer } from './reducer'
import { rootSaga } from './sagas'
import { getData as getConfig } from './modules/config/selectors'

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const sagasMiddleware = createSagasMiddleware()
const loggerMiddleware = createLogger({
  collapsed: () => true,
  predicate: (getState: Function, action: any) => {
    const { isDev } = getConfig(getState())
    return isDev || action.type.includes('Failure')
  }
})

const middleware = applyMiddleware(loggerMiddleware, sagasMiddleware)

const enhancer = composeEnhancers(middleware)
const store = createStore(rootReducer, enhancer)

sagasMiddleware.run(rootSaga)

export { store }
