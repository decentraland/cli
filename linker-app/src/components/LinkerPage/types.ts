import { ConnectWalletRequestAction } from 'decentraland-dapps/dist/modules/wallet/actions'
import { BaseWallet } from 'decentraland-dapps/dist/modules/wallet/types'
import { Transaction } from 'decentraland-dapps/dist/modules/transaction/types'

import { LAND } from '../../modules/land/types'
import { SignContentRequestAction } from '../../modules/signature/actions'

export type LinkerPageProps = {
  sceneOwner: string
  base: LAND
  wallet: Partial<BaseWallet>
  transaction: Transaction
  isLandLoading: boolean
  isConnected: boolean
  isConnecting: boolean
  error: string
  signed: boolean
  onConnectWallet: () => ConnectWalletRequestAction
  onSignContent: (cid: string) => SignContentRequestAction
}
