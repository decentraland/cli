import { ConnectWalletRequestAction } from 'decentraland-dapps/dist/modules/wallet/actions'
import { BaseWallet } from 'decentraland-dapps/dist/modules/wallet/types'
import { Transaction } from 'decentraland-dapps/dist/modules/transaction/types'

import { LANDMeta } from '../../modules/land/types'
import { SignContentRequestAction } from '../../modules/signature/actions'
import { Authorization } from '../../modules/authorization/types'

export type LinkerPageProps = {
  sceneOwner: string
  base: LANDMeta
  wallet: Partial<BaseWallet>
  transaction: Transaction
  isLandLoading: boolean
  isConnected: boolean
  isConnecting: boolean
  error: string
  signed: boolean
  isUpdateAuthorized: boolean
  authorizations: Authorization[]
  onConnectWallet: () => ConnectWalletRequestAction
  onSignContent: (cid: string) => SignContentRequestAction
}
