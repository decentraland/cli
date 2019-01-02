import { call, put, takeEvery, select } from 'redux-saga/effects'
import { CONNECT_WALLET_SUCCESS } from 'decentraland-dapps/dist/modules/wallet/actions'
import { getAddress } from 'decentraland-dapps/dist/modules/wallet/selectors'

import { LANDRegistry, EstateRegistry } from '../../contracts'
import { parcels } from '../../config'
import {
  FETCH_AUTHORIZATIONS_REQUEST,
  FetchAuthorizationsRequestAction,
  fetchAuthorizationsRequest,
  fetchAuthorizationsFailure,
  fetchAuthorizationsSuccess
} from './actions'
import { Authorization } from './types'
import { Coords } from '../land/types'

export function* authorizationSaga() {
  yield takeEvery(
    FETCH_AUTHORIZATIONS_REQUEST,
    handleFetchAuthorizationsRequest
  )
  yield takeEvery(CONNECT_WALLET_SUCCESS, handleConnectWalletSuccess)
}

function* handleFetchAuthorizationsRequest(
  action: FetchAuthorizationsRequestAction
) {
  try {
    const address = yield select(getAddress)
    const assetIds = new Map<Coords, string>()

    const pAuthorizations = []
    for (const parcel of parcels) {
      const { x, y } = parcel
      const pAuthorization = new Promise((resolve, reject) => {
        LANDRegistry['encodeTokenId'](x, y)
          .then(assetId => {
            LANDRegistry['isUpdateAuthorized'](address, assetId)
              .then(isUpdateAuthorized => {
                assetIds.set(parcel, assetId)
                resolve({ x, y, isUpdateAuthorized })
              })
              .catch(reject)
          })
          .catch(reject)
      })
      pAuthorizations.push(pAuthorization)
    }

    const parcelAuthorizations: Authorization[] = yield call(() =>
      Promise.all(pAuthorizations)
    )

    // If not authorized check permissions on estate
    const notAllowedAuthorizations = parcelAuthorizations.filter(
      a => !a.isUpdateAuthorized
    )
    const allowedAuthorizations = parcelAuthorizations.filter(
      a => a.isUpdateAuthorized
    )

    const pEstateAuthorizations = []
    for (const a of notAllowedAuthorizations) {
      const { x, y } = a
      const assetId = assetIds.get({ x, y })
      const pAuthorization = new Promise((resolve, reject) => {
        EstateRegistry['getLandEstateId'](assetId)
          .then(estate => {
            if (estate && estate > 0) {
              return EstateRegistry['isUpdateAuthorized'](address, estate).then(
                isUpdateAuthorized => {
                  resolve(isUpdateAuthorized)
                }
              )
            } else {
              return resolve(false) // If no estate leave authorization in false
            }
          })
          .catch(reject)
      })
      pEstateAuthorizations.push(pAuthorization)
    }

    const estateAuthorizations: Authorization[] = yield call(() =>
      Promise.all(pEstateAuthorizations)
    )

    const authorizations = [...allowedAuthorizations, ...estateAuthorizations]
    yield put(fetchAuthorizationsSuccess(authorizations))
  } catch (error) {
    yield put(fetchAuthorizationsFailure(error.message))
  }
}

function* handleConnectWalletSuccess() {
  const address = yield call(() => getAddress)
  yield put(fetchAuthorizationsRequest(address))
}
