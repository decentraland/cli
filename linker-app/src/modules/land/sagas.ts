import { call, put, takeEvery } from 'redux-saga/effects'
import { contracts } from 'decentraland-eth'
import { CONNECT_WALLET_SUCCESS } from 'decentraland-dapps/dist/modules/wallet/actions'

import { baseParcel } from '../../config'
import { LANDRegistry } from '../../contracts'
import {
  FETCH_LAND_REQUEST,
  FetchLandRequestAction,
  fetchLandSuccess,
  fetchLandFailure,
  fetchLandRequest
} from './actions'
import { getEmptyLandData } from './utils'

export function* landSaga() {
  yield takeEvery(FETCH_LAND_REQUEST, handleFetchLandRequest)
  yield takeEvery(CONNECT_WALLET_SUCCESS, handleConnectWalletSuccess)
}

function* handleFetchLandRequest(action: FetchLandRequestAction) {
  try {
    const { x, y } = action.payload
    const data = yield call(() => LANDRegistry['landData'](x, y))
    const land = data
      ? contracts.LANDRegistry.decodeLandData(data)
      : getEmptyLandData()
    yield put(fetchLandSuccess(land))
  } catch (error) {
    yield put(fetchLandFailure(error.message))
  }
}

function* handleConnectWalletSuccess() {
  yield put(fetchLandRequest(baseParcel))
}
