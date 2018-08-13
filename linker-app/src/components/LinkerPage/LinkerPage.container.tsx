import { AnyAction, Dispatch } from 'redux'
import { connect } from 'react-redux'
import { getData as getWallet, isConnected as isWalletConnected } from 'decentraland-dapps/dist/modules/wallet/selectors'
import { getPendingTransactions, getTransactionHistory } from 'decentraland-dapps/dist/modules/transaction/selectors'

import { RootState } from '../../types'
import { LinkerPageProps } from './types'
import { isLoading as isLandLoading, getData as getLand, getError } from '../../modules/land/selectors'
import { ManyLAND } from '../../modules/land/types'

import LinkerPage from './LinkerPage'
import { updateLandRequest } from '../../modules/land/actions'

const mapState = (state: RootState, ownProps: LinkerPageProps): LinkerPageProps => {
  const wallet = getWallet(state)

  const pendingTransactions = wallet.address ? getPendingTransactions(state, wallet.address).reverse() : []
  const transactionHistory = wallet.address ? getTransactionHistory(state, wallet.address).reverse() : []

  const isLoading = !isWalletConnected(state) || isLandLoading(state)
  const base = getLand(state)
  const error = getError(state)

  return { ...ownProps, base, wallet, pendingTransactions, transactionHistory, isLoading, error }
}

const mapDispatch = (dispatch: Dispatch<AnyAction>): Partial<LinkerPageProps> => ({
  onUpdateLand: (manyLand: ManyLAND) => dispatch(updateLandRequest(manyLand))
})

export default connect<LinkerPageProps>(
  mapState,
  mapDispatch
)(LinkerPage)
