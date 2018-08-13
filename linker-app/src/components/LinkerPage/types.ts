import { BaseWallet } from 'decentraland-dapps/dist/modules/wallet/types'
import { Transaction } from 'decentraland-dapps/dist/modules/transaction/types'

import { LANDMeta, Coords, ManyLAND } from '../../modules/land/types'
import { UpdateLandRequestAction } from '../../modules/land/actions'

export interface LinkerPageProps {
  sceneOwner: string
  base: LANDMeta
  wallet: Partial<BaseWallet>
  pendingTransactions: Transaction[]
  transactionHistory: Transaction[]
  isLoading: boolean
  error: string
  onUpdateLand: (manyLand: ManyLAND) => UpdateLandRequestAction
}

export interface IOptions {
  id: string
  value: Coords
  checked: boolean
  base: boolean
}

export interface LinkerPageState {
  options: IOptions[]
}
