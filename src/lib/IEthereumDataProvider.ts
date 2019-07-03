import { LANDData } from './Ethereum'
import { Coords } from '../utils/coordinateHelpers'

export interface IEthereumDataProvider {
  getEstateIdOfLand: (coords: Coords) => Promise<number>
  getEstateData: (estateId: number) => Promise<LANDData>
  getEstateOwner: (estateId: number) => Promise<string>
  getEstateOperator: (estateId: number) => Promise<string>
  getEstateUpdateOperator: (estateId: number) => Promise<string>
  getLandOfEstate: (estateId: number) => Promise<Coords[]>
  getLandData: (coords: Coords) => Promise<LANDData>
  getLandOwner: (coords: Coords) => Promise<string>
  getLandOperator: (coords: Coords) => Promise<string>
  getLandUpdateOperator: (coords: Coords) => Promise<string>
  getLandOf: (owner: string) => Promise<Coords[]>
  getEstatesOf: (owner: string) => Promise<number[]>
}
