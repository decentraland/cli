import { call, put, takeLatest, takeEvery, select } from 'redux-saga/effects'
import { createEth } from 'decentraland-dapps/dist/lib/eth'
import { getAddress, getNetwork } from 'decentraland-dapps/dist/modules/wallet/selectors'
import { Web3Provider } from '@ethersproject/providers'
import { toUtf8Bytes } from '@ethersproject/strings'
import { hexlify } from '@ethersproject/bytes'

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
    const dataToSign = toUtf8Bytes(action.payload)

    const eth = yield call(() => createEth())
    const provider = new Web3Provider(eth.provider['provider'])
    const signer = provider.getSigner()

    const addr = yield call(() => signer.getAddress())

    const signedMessage = yield call(() =>
      provider.send('personal_sign', [hexlify(dataToSign), addr.toLowerCase()])
    )
    yield put(signContentSuccess(signedMessage))
  } catch (error) {
    yield put(signContentFailure(error.message))
  }
}

function* handleSignContentSuccess(action: SignContentSuccessAction) {
  const address = yield select(getAddress)
  const network = yield select(getNetwork)
  const { signature } = action.payload

  try {
    yield call(() => {
      closeServer(true, { signature, address, network })
    })
  } catch (error) {
    yield put(signContentFailure(error.message))
  }
}
