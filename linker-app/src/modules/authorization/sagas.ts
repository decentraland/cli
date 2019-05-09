import { call, put, takeEvery, select } from 'redux-saga/effects'
import { CONNECT_WALLET_SUCCESS } from 'decentraland-dapps/dist/modules/wallet/actions'
import { getAddress } from 'decentraland-dapps/dist/modules/wallet/selectors'

import { getLandContract, getEstateContract } from '../../contracts'
import { parcels } from '../../config'
import { coordsToString } from '../land/utils'
import {
  FETCH_AUTHORIZATIONS_REQUEST,
  FetchAuthorizationsRequestAction,
  fetchAuthorizationsRequest,
  fetchAuthorizationsFailure,
  fetchAuthorizationsSuccess
} from './actions'
import { Authorization } from './types'

export function* authorizationSaga() {
  yield takeEvery(CONNECT_WALLET_SUCCESS, handleConnectWalletSuccess)
  yield takeEvery(FETCH_AUTHORIZATIONS_REQUEST, handleFetchAuthorizationsRequest)
}

function* handleFetchAuthorizationsRequest(action: FetchAuthorizationsRequestAction) {
  const LANDRegistry = getLandContract()
  const EstateRegistry = getEstateContract()

  try {
    const address = yield select(getAddress)
    const assetIds = new Map<string, string>()

    const pAuthorizations = []
    for (const parcel of parcels) {
      const { x, y } = parcel
      const pAuthorization = new Promise((resolve, reject) => {
        LANDRegistry['encodeTokenId'](x, y)
          .then(assetId => {
            LANDRegistry['isUpdateAuthorized'](address, assetId)
              .then(isUpdateAuthorized => {
                assetIds.set(coordsToString(parcel), assetId)
                resolve({ x, y, isUpdateAuthorized })
              })
              .catch(reject)
          })
          .catch(reject)
      })
      pAuthorizations.push(pAuthorization)
    }

    const parcelAuthorizations: Authorization[] = yield call(() => Promise.all(pAuthorizations))

    // If not authorized check permissions on estate
    const notAllowedAuthorizations = parcelAuthorizations.filter(a => !a.isUpdateAuthorized)
    const allowedAuthorizations = parcelAuthorizations.filter(a => a.isUpdateAuthorized)

    const pEstateAuthorizations = []
    for (const a of notAllowedAuthorizations) {
      const assetId = assetIds.get(coordsToString(a))
      const pAuthorization = new Promise((resolve, reject) => {
        EstateRegistry['getLandEstateId'](assetId)
          .then(estate => {
            if (estate && estate > 0) {
              return EstateRegistry['isUpdateAuthorized'](address, estate).then(
                isUpdateAuthorized => {
                  resolve({ ...a, isUpdateAuthorized })
                }
              )
            } else {
              return resolve(a) // If no estate leave authorization in false
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
