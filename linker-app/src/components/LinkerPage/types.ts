import { Ethereum } from '../../modules/Ethereum'
import { ICoords } from '../../utils/coordinateHelpers'

export interface LinkerPageProps {
  isDev: boolean
  onFetchConfig: Function
}

export interface IOptions {
  id: string
  value: ICoords
  checked: boolean
  base: boolean
}

export interface LinkerPageState {
  loading: boolean
  transactionLoading: boolean
  error: string
  ethereum: Ethereum
  base: ICoords
  options: IOptions[]
  owner: string
  address: string
  ipfsKey?: string
  tx: string
}
