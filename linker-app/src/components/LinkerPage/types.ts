import { ConnectWalletRequestAction } from 'decentraland-dapps/dist/modules/wallet/actions'
import { BaseWallet } from 'decentraland-dapps/dist/modules/wallet/types'
import { Transaction } from 'decentraland-dapps/dist/modules/transaction/types'

import { LANDMeta } from '../../modules/land/types'
import { SignContentRequestAction } from '../../modules/land/actions'

export interface LinkerPageProps {
  sceneOwner: string
  base: LANDMeta
  wallet: Partial<BaseWallet>
  transaction: Transaction
  isLoading: boolean
  isConnected: boolean
  isConnecting: boolean
  error: string
  onConnectWallet: () => ConnectWalletRequestAction
  onSignContent: (cid: string) => SignContentRequestAction
}
