import { BaseWallet } from 'decentraland-dapps/dist/modules/wallet/types'
import { Transaction } from 'decentraland-dapps/dist/modules/transaction/types'

import { LANDMeta, Coords } from '../../modules/land/types'
import { UpdateLandRequestAction } from '../../modules/land/actions'

export interface LinkerPageProps {
  sceneOwner: string
  target: LANDMeta
  wallet: Partial<BaseWallet>
  transaction: Transaction
  isLoading: boolean
  error: string
  onUpdateLand: (LANDMeta) => UpdateLandRequestAction
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
