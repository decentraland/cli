import { call, put, takeEvery, select } from 'redux-saga/effects'
import { contracts } from 'decentraland-eth'
import { CONNECT_WALLET_SUCCESS } from 'decentraland-dapps/dist/modules/wallet/actions'

import { baseParcel } from '../config'
import { LANDRegistry } from '../../contracts'
import { FETCH_LAND_REQUEST, FetchLandRequestAction, fetchLandSuccess, fetchLandFailure, fetchLandRequest } from './actions'
import { getEmptyLandData } from './utils'
import { getAddress } from 'decentraland-dapps/dist/modules/wallet/selectors'

export function* landSaga() {
  yield takeEvery(FETCH_LAND_REQUEST, handleFetchLandRequest)
  yield takeEvery(CONNECT_WALLET_SUCCESS, handleConnectWalletSuccess)
}

function* handleFetchLandRequest(action: FetchLandRequestAction) {
  try {
    const { x, y } = action.payload
    const address = yield select(getAddress)
    const assetId = yield call(() => LANDRegistry['encodeTokenId'](x, y))
    const [data, isUpdateAuthorized] = yield call(() =>
      Promise.all([LANDRegistry['landData'](x, y), LANDRegistry['isUpdateAuthorized'](address, assetId)])
    )
    const land = data ? contracts.LANDRegistry.decodeLandData(data) : getEmptyLandData()
    yield put(fetchLandSuccess({ ...land, isUpdateAuthorized }))
  } catch (error) {
    yield put(fetchLandFailure(error.message))
  }
}

function* handleConnectWalletSuccess() {
  yield put(fetchLandRequest(baseParcel))
}
