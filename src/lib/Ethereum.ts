import { EventEmitter } from 'events'
import {
  RequestManager,
  ContractFactory,
  HTTPProvider,
  Contract
} from 'eth-connect'

import { IEthereumDataProvider } from './IEthereumDataProvider'
import { ErrorType, fail } from '../utils/errors'
import { Coords, getObject } from '../utils/coordinateHelpers'
import { filterAndFillEmpty } from '../utils/land'
import { isDebug } from '../utils/env'
import { DCLInfo, getConfig } from '../config'
import { abi as manaAbi } from '../../abi/MANAToken.json'
import { abi as landAbi } from '../../abi/LANDRegistry.json'
import { abi as estateAbi } from '../../abi/EstateRegistry.json'

const { provider } = getConfig()
const providerInstance = new HTTPProvider(provider!)
const requestManager = new RequestManager(providerInstance)
providerInstance.debug = isDebug()

const manaFactory = new ContractFactory(requestManager, manaAbi)
const landFactory = new ContractFactory(requestManager, landAbi)
const estateFactory = new ContractFactory(requestManager, estateAbi)

const factories = new Map<string, ContractFactory>()
factories.set('MANAToken', manaFactory)
factories.set('LANDRegistry', landFactory)
factories.set('EstateRegistry', estateFactory)

type ContractData = Contract &
  Record<string, (...args: any) => Promise<unknown>>

export type LANDData = {
  version?: number
  name: string | null
  description: string | null
}

export type Network = {
  id: number
  name: string
  label?: string
}

export enum NETWORKS {
  mainnet = 'mainnet',
  ropsten = 'ropsten'
}

/**
 * Events emitted by this class:
 *
 */
export class Ethereum extends EventEmitter implements IEthereumDataProvider {
  private static contracts = new Map<string, ContractData>()

  static async getContract(name: keyof DCLInfo): Promise<ContractData> {
    const contract = this.contracts.get(name)
    if (contract) {
      return contract
    }

    const config = getConfig()
    const address = config[name] as string
    const factory = factories.get(name)!
    const factoryContract = (await factory.at(address)) as ContractData
    this.contracts.set(name, factoryContract)

    return factoryContract
  }

  async getLandOf(address: string): Promise<Coords[]> {
    const contract = await Ethereum.getContract('LANDRegistry')
    try {
      const [x, y] = (await contract['landOf'](address.toUpperCase())) as any
      return x.map(($: any, i: any) => ({
        x: $.toNumber(),
        y: y[i].toNumber()
      }))
    } catch (e: any) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LANDs: ${e.message}`)
      throw e
    }
  }

  async getEstatesOf(address: string): Promise<number[]> {
    const contract = await Ethereum.getContract('EstateRegistry')
    try {
      const balance = (await contract['balanceOf'](address)) as number
      const requests = []
      for (let i = 0; i < balance; i++) {
        const request = contract['tokenOfOwnerByIndex'](
          address,
          i
        ) as Promise<number>
        requests.push(request)
      }
      return Promise.all(requests)
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch Estate IDs of owner: ${e.message}`
      )
      throw e
    }
    return []
  }

  async getLandData({ x, y }: Coords): Promise<LANDData> {
    const contract = await Ethereum.getContract('LANDRegistry')
    try {
      const landData = (await contract['landData'](x, y)) as string
      return filterAndFillEmpty(this.decodeLandData(landData))
    } catch (e: any) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND data: ${e.message}`)
      throw e
    }
  }

  async getEstateData(estateId: number): Promise<LANDData> {
    const contract = await Ethereum.getContract('EstateRegistry')
    try {
      const landData = (await contract['getMetadata'](estateId)) as string
      return filterAndFillEmpty(this.decodeLandData(landData))
    } catch (e: any) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND data: ${e.message}`)
      throw e
    }
  }

  async getLandOwner({ x, y }: Coords): Promise<string> {
    const contract = await Ethereum.getContract('LANDRegistry')
    try {
      return contract['ownerOfLand'](x, y) as Promise<string>
    } catch (e: any) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND owner: ${e.message}`)
      throw e
    }
  }

  async getLandOperator({ x, y }: Coords): Promise<string> {
    const contract = await Ethereum.getContract('LANDRegistry')
    try {
      const assetId = (await contract['encodeTokenId'](x, y)) as string
      return contract['getApproved'](assetId) as Promise<string>
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch LAND operator: ${e.message}`
      )
      throw e
    }
  }

  async getLandUpdateOperator({ x, y }: Coords): Promise<string> {
    const contract = await Ethereum.getContract('LANDRegistry')
    try {
      const assetId = (await contract['encodeTokenId'](x, y)) as string
      return contract['updateOperator'](assetId) as Promise<string>
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch LAND update operator: ${e.message}`
      )
      throw e
    }
  }

  async getEstateOwner(estateId: number): Promise<string> {
    const contract = await Ethereum.getContract('EstateRegistry')
    try {
      return contract['ownerOf'](estateId) as Promise<string>
    } catch (e: any) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND owner: ${e.message}`)
      throw e
    }
  }

  async getEstateOperator(estateId: number): Promise<string> {
    const contract = await Ethereum.getContract('EstateRegistry')
    try {
      return contract['getApproved'](estateId) as Promise<string>
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch Estate operator: ${e.message}`
      )
      throw e
    }
  }

  async getEstateUpdateOperator(estateId: number): Promise<string> {
    const contract = await Ethereum.getContract('EstateRegistry')
    try {
      return contract['updateOperator'](estateId) as Promise<string>
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch Estate update operator: ${e.message}`
      )
      throw e
    }
  }

  async validateAuthorization(owner: string, parcels: Coords[]) {
    const validations = parcels.map((parcel) =>
      this.validateAuthorizationOfParcel(owner, parcel)
    )
    return Promise.all(validations)
  }

  /**
   * It fails if the owner address isn't able to update given parcel (as an owner or operator)
   */
  async validateAuthorizationOfParcel(
    owner: string,
    parcel: Coords
  ): Promise<void> {
    const isLandOperator = await this.isLandOperator(parcel, owner)
    if (!isLandOperator) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Provided address ${owner} is not authorized to update LAND ${parcel.x},${parcel.y}`
      )
    }
  }

  async getLandOfEstate(estateId: number): Promise<Coords[]> {
    const contract = await Ethereum.getContract('EstateRegistry')
    const landContract = await Ethereum.getContract('LANDRegistry')

    try {
      const estateSize = (await contract['getEstateSize'](estateId)) as number
      const promiseParcels: Promise<string>[] = []

      for (let i = 0; i < estateSize; i++) {
        const request = contract['estateLandIds'](estateId, i).then((p) => {
          return landContract['decodeTokenId']([p]) as Promise<string>
        })
        promiseParcels.push(request)
      }

      const parcels = (await Promise.all(promiseParcels)).map(getObject)

      return parcels
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch LANDs of Estate: ${e.message}`
      )
      throw e
    }
  }

  async getEstateIdOfLand({ x, y }: Coords): Promise<number> {
    const contract = await Ethereum.getContract('EstateRegistry')
    const landContract = await Ethereum.getContract('LANDRegistry')

    try {
      const assetId = (await landContract['encodeTokenId'](x, y)) as string
      return contract['getLandEstateId'](assetId) as Promise<number>
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch Estate ID of LAND: ${e.message}`
      )
      throw e
    }
  }

  private async isLandOperator(
    coords: Coords,
    owner: string
  ): Promise<boolean> {
    const contract = await Ethereum.getContract('LANDRegistry')

    const estate = await this.getEstateIdOfLand(coords)

    if (estate && estate > 0) {
      return this.isEstateOperator(estate, owner)
    }

    try {
      const { x, y } = coords
      const assetId = (await contract['encodeTokenId'](x, y)) as string
      return contract['isUpdateAuthorized'](
        owner.toLowerCase(),
        assetId.toString()
      ) as Promise<boolean>
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch LAND authorization: ${JSON.stringify(e)}`
      )
      throw e
    }
  }

  private async isEstateOperator(
    estateId: number,
    owner: string
  ): Promise<boolean> {
    const contract = await Ethereum.getContract('EstateRegistry')
    try {
      return contract['isUpdateAuthorized'](owner, estateId) as Promise<boolean>
    } catch (e: any) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch Estate authorization: ${e.message}`
      )
      throw e
    }
  }

  private decodeLandData(data: string = ''): LANDData | null {
    if (data === '') {
      return null
    }

    const [, name, description] = data.split(',').map((field) => {
      return field.slice(1, -1)
    })

    return { version: 0, name: name || null, description: description || null }
  }
}
