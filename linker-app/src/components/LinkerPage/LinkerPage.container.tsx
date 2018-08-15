import { AnyAction, Dispatch } from 'redux'
import { connect } from 'react-redux'
import { getData as getWallet, isConnected as isWalletConnected } from 'decentraland-dapps/dist/modules/wallet/selectors'
import { getData as getTransactions } from 'decentraland-dapps/dist/modules/transaction/selectors'

import { RootState } from '../../types'
import { LinkerPageProps } from './types'
import { isLoading as isLandLoading, getData as getLand, getError } from '../../modules/land/selectors'
import { ManyLAND } from '../../modules/land/types'
import { updateLandRequest } from '../../modules/land/actions'

import LinkerPage from './LinkerPage'

const mapState = (state: RootState, ownProps: LinkerPageProps): LinkerPageProps => {
  const wallet = getWallet(state)

  const transaction = getTransactions(state)[0]

  const isLoading = !isWalletConnected(state) || isLandLoading(state)
  const base = getLand(state)
  const error = getError(state)

  return { ...ownProps, base, wallet, transaction, isLoading, error }
}

const mapDispatch = (dispatch: Dispatch<AnyAction>): Partial<LinkerPageProps> => ({
  onUpdateLand: (manyLand: ManyLAND) => dispatch(updateLandRequest(manyLand))
})

export default connect<LinkerPageProps>(
  mapState,
  mapDispatch
)(LinkerPage)
