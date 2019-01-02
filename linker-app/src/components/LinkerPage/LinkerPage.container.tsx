import { AnyAction, Dispatch } from 'redux'
import { connect } from 'react-redux'
import { connectWalletRequest } from 'decentraland-dapps/dist/modules/wallet/actions'
import {
  getData as getWallet,
  isConnected,
  isConnecting
} from 'decentraland-dapps/dist/modules/wallet/selectors'

import {
  isLoading as isLandLoading,
  getData as getLand,
  getError as getLandError
} from '../../modules/land/selectors'
import { getData as getSignature } from '../../modules/signature/selectors'
import { isUpdateAuthorized } from '../../modules/authorization/selectors'
import { signContentRequest } from '../../modules/signature/actions'
import { RootState } from '../../types'
import { LinkerPageProps } from './types'

import LinkerPage from './LinkerPage'

const mapState = (state: RootState, ownProps: LinkerPageProps): LinkerPageProps => {
  return {
    ...ownProps,
    base: getLand(state),
    wallet: getWallet(state),
    isLandLoading: isLandLoading(state),
    isConnected: isConnected(state),
    isConnecting: isConnecting(state),
    error: getLandError(state),
    signed: !!getSignature(state),
    isUpdateAuthorized: isUpdateAuthorized(state)
  }
}

const mapDispatch = (dispatch: Dispatch<AnyAction>): Partial<LinkerPageProps> => ({
  onConnectWallet: () => dispatch(connectWalletRequest()),
  onSignContent: (cid: string) => dispatch(signContentRequest(cid))
})

export default connect<LinkerPageProps>(
  mapState,
  mapDispatch
)(LinkerPage)
