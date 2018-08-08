import { call, put, takeEvery } from 'redux-saga/effects'
import { FETCH_CONFIG_REQUEST } from './types'
import { fetchConfigSuccess, fetchConfigFailure } from './actions'
import { Server } from '../Server'

export function* configSaga() {
  yield takeEvery(FETCH_CONFIG_REQUEST, handleConfigRequest)
}

function* handleConfigRequest() {
  try {
    const env: string = yield call(() => Server.getEnvironment())
    const config = { isDev: env === 'dev' }
    yield put(fetchConfigSuccess(config))
  } catch (error) {
    yield put(fetchConfigFailure(error.message))
  }
}
