import { AnyAction, Dispatch } from 'redux'
import { connect } from 'react-redux'
import {
  getData as getWallet,
  isConnected as isWalletConnected,
  getError as getWalletError
} from 'decentraland-dapps/dist/modules/wallet/selectors'

import { RootState } from '../../types'
import { LinkerPageProps } from './types'
import { isLoading as isLandLoading, getData as getLand, getError as getLandError } from '../../modules/land/selectors'
import { signContentRequest } from '../../modules/land/actions'

import LinkerPage from './LinkerPage'

const mapState = (state: RootState, ownProps: LinkerPageProps): LinkerPageProps => {
  const wallet = getWallet(state)

  const isLoading = !isWalletConnected(state) || isLandLoading(state)

  const base = getLand(state)
  const error = getLandError(state) || getWalletError(state)

  return { ...ownProps, base, wallet, isLoading, error }
}

const mapDispatch = (dispatch: Dispatch<AnyAction>): Partial<LinkerPageProps> => ({
  onSignContent: (cid: string) => dispatch(signContentRequest(cid))
})

export default connect<LinkerPageProps>(
  mapState,
  mapDispatch
)(LinkerPage)
