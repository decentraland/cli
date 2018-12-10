import { call, put, takeLatest, takeEvery } from 'redux-saga/effects'
import { eth } from 'decentraland-eth'

import { closeServer } from '../server/utils'
import {
  SIGN_CONTENT_REQUEST,
  SIGN_CONTENT_SUCCESS,
  SignContentRequestAction,
  signContentSuccess,
  signContentFailure,
  SignContentSuccessAction
} from './actions'

export function* signatureSaga() {
  yield takeLatest(SIGN_CONTENT_REQUEST, handleSignContentRequest)
  yield takeEvery(SIGN_CONTENT_SUCCESS, handleSignContentSuccess)
}

function* handleSignContentRequest(action: SignContentRequestAction) {
  try {
    const hashToSign = action.payload
    const signedMessage = yield call(() => {
      return eth.wallet.sign(hashToSign)
    })
    yield put(signContentSuccess(signedMessage))
  } catch (error) {
    yield put(signContentFailure(error.message))
  }
}

function* handleSignContentSuccess(action: SignContentSuccessAction) {
  const address = eth.wallet.getAccount()
  const { signature } = action.payload

  try {
    yield call(() => {
      closeServer(true, JSON.stringify({ signature, address }))
    })
  } catch (error) {
    yield put(signContentFailure(error.message))
  }
}
