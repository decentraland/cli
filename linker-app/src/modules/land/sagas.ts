import { call, put, takeLatest, takeEvery } from 'redux-saga/effects'
import { contracts } from 'decentraland-eth'
import { CONNECT_WALLET_SUCCESS, ConnectWalletSuccessAction } from 'decentraland-dapps/dist/modules/wallet/actions'

import {
  FETCH_LAND_REQUEST,
  FetchLandRequestAction,
  fetchLandSuccess,
  fetchLandFailure,
  UPDATE_LAND_REQUEST,
  UpdateLandRequestAction,
  updateLandSuccess,
  updateLandFailure,
  fetchLandRequest
} from './actions'
import { ipfsKey, baseParcel } from '../config'
import { LANDRegistry } from '../../contracts'
import { getEmptyLandData } from './utils'

export function* landSaga() {
  yield takeEvery(FETCH_LAND_REQUEST, handleFetchLandRequest)
  yield takeEvery(CONNECT_WALLET_SUCCESS, handleConnectWalletSuccess)
  yield takeLatest(UPDATE_LAND_REQUEST, handleUpdateLandRequest)
}

function* handleFetchLandRequest(action: FetchLandRequestAction) {
  try {
    const { x, y } = action.payload
    const data = yield call(() => LANDRegistry['landData'](x, y))
    const land = data ? contracts.LANDRegistry.decodeLandData(data) : getEmptyLandData()
    yield put(fetchLandSuccess(land))
  } catch (error) {
    yield put(fetchLandFailure(error.message))
  }
}

function* handleConnectWalletSuccess(action: ConnectWalletSuccessAction) {
  const { x, y } = baseParcel
  yield put(fetchLandRequest({ x, y }))
}

function* handleUpdateLandRequest(action: UpdateLandRequestAction) {
  try {
    const { base, parcels } = action.payload
    const land = { ...base, ipns: `ipns:${ipfsKey}` }
    const data = contracts.LANDRegistry.encodeLandData(land)
    const txHash = yield call(() => LANDRegistry.updateManyLandData(parcels, data))

    yield put(updateLandSuccess(txHash))
  } catch (error) {
    yield put(updateLandFailure(error.message))
  }
}
