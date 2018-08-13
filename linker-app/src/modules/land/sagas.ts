import { call, put, takeLatest, takeEvery } from 'redux-saga/effects'
import { contracts } from 'decentraland-eth'

import {
  FETCH_LAND_REQUEST,
  FetchLandRequestAction,
  FetchLandSuccess,
  FetchLandFailure,
  UPDATE_LAND_REQUEST,
  UpdateLandRequestAction,
  updateLandSuccess,
  updateLandFailure
} from './actions'
import { ipfsKey } from '../config'
import { LANDRegistry } from '../../contracts'

export function* landSaga() {
  yield takeEvery(FETCH_LAND_REQUEST, handleFetchLandRequest)
  yield takeLatest(UPDATE_LAND_REQUEST, handleUpdateLandRequest)
}

function* handleFetchLandRequest(action: FetchLandRequestAction) {
  try {
    const { x, y } = action.payload
    const data = yield call(() => LANDRegistry['landData'](x, y))
    const land = contracts.LANDRegistry.decodeLandData(data)
    yield put(FetchLandSuccess(land))
  } catch (error) {
    yield put(FetchLandFailure(error.message))
  }
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
