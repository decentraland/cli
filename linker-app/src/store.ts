import { applyMiddleware, compose, createStore } from 'redux'
import createSagasMiddleware from 'redux-saga'

import { rootReducer } from './reducer'
import { rootSaga } from './sagas'

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

const sagasMiddleware = createSagasMiddleware()

const middleware = applyMiddleware(sagasMiddleware)

const enhancer = composeEnhancers(middleware)
const store = createStore(rootReducer, enhancer)

sagasMiddleware.run(rootSaga)

export { store }
