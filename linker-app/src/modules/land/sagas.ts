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
import { ipfsKey, baseParcel, isEstate, estateId } from '../config'
import { LANDRegistry, EstateRegistry } from '../../contracts'
import { Coords } from './types'
import { getEmptyLandData } from './utils'

export function* landSaga() {
  yield takeEvery(FETCH_LAND_REQUEST, handleFetchLandRequest)
  yield takeEvery(CONNECT_WALLET_SUCCESS, handleConnectWalletSuccess)
  yield takeLatest(UPDATE_LAND_REQUEST, handleUpdateLandRequest)
}

function* handleFetchLandRequest(action: FetchLandRequestAction) {
  try {
    let data
    if (isEstate()) {
      data = yield call(() => EstateRegistry['getMetadata'](action.payload))
    } else {
      const { x, y } = action.payload as Coords
      data = yield call(() => LANDRegistry['landData'](x, y))
    }
    const land = data ? contracts.LANDRegistry.decodeLandData(data) : getEmptyLandData()
    yield put(fetchLandSuccess(land))
  } catch (error) {
    yield put(fetchLandFailure(error.message))
  }
}

function* handleConnectWalletSuccess(action: ConnectWalletSuccessAction) {
  yield put(fetchLandRequest(isEstate() ? estateId : baseParcel))
}

function* handleUpdateLandRequest(action: UpdateLandRequestAction) {
  try {
    const target = action.payload
    const land = { ...target, ipns: `ipns:${ipfsKey}` }
    const data = contracts.LANDRegistry.encodeLandData(land)
    const txHash = yield call(
      () =>
        isEstate() ? EstateRegistry['updateMetadata'](estateId, data) : LANDRegistry['updateLandData'](baseParcel.x, baseParcel.y, data)
    )

    yield put(updateLandSuccess(txHash))
  } catch (error) {
    yield put(updateLandFailure(error.message))
  }
}
