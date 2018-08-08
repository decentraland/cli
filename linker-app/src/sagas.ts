import { all } from 'redux-saga/effects'
import { configSaga } from './modules/config/sagas'

export function* rootSaga() {
  yield all([configSaga])
}
