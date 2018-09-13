import { EventEmitter } from 'events'
import * as fetch from 'isomorphic-fetch'
import * as CSV from 'comma-separated-values'
import { RequestManager, ContractFactory, providers, Contract } from 'eth-connect'

import { isDev, getProvider } from '../utils/env'
import { ErrorType, fail } from '../utils/errors'
import { ICoords, isEqual, getObject } from '../utils/coordinateHelpers'
const { abi } = require('../../abi/LANDRegistry.json')

const provider = process.env.RPC_URL || getProvider()
const requestManager = new RequestManager(new providers.HTTPProvider(provider))
const factory = new ContractFactory(requestManager, abi)

export interface ILandData {
  id: string
  version: number
  name: string
  description: string
  ipns: string
}

/**
 * Events emitted by this class:
 *
 * ethereum:get-ipns         - An attempt to load landData from the ethereum blockchain
 * ethereum:get-ipns-empty   - No IPNS was found on the blockchain
 * ethereum:get-ipns-success - Successfully fetched and parsed landData
 */
export class Ethereum extends EventEmitter {
  private static addresses: any
  private static contracts = new Map<string, Contract>()

  static async getContractAddresses(): Promise<any> {
    if (this.addresses) {
      return this.addresses
    }

    try {
      const raw = await fetch('https://contracts.decentraland.org/addresses.json')
      this.addresses = await raw.json()
      return this.addresses
    } catch (error) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch decentraland contracts from "https://contracts.decentraland.org/addresses.json", error: ${error.message}`
      )
    }
  }

  static async getContractAddress(name: string): Promise<string> {
    const addresses = await this.getContractAddresses()
    return addresses[isDev ? 'ropsten' : 'mainnet'][name]
  }

  static async getContract(name: string): Promise<Contract> {
    if (this.contracts.get(name)) {
      return this.contracts.get(name)
    }

    const address = await this.getContractAddress(name)
    const contract = await factory.at(address)
    this.contracts.set(name, contract)
    return contract
  }

  static async getLandContractAddress(): Promise<string> {
    const envContract = process.env.LAND_REGISTRY_CONTRACT_ADDRESS
    return envContract || this.getContractAddress('LANDProxy')
  }

  static async getManaContractAddress(): Promise<string> {
    const envContract = process.env.MANA_TOKEN_CONTRACT_ADDRESS
    return envContract || this.getContractAddress('MANAToken')
  }

  static async getEstateContractAddress(): Promise<string> {
    const envContract = process.env.MANA_TOKEN_CONTRACT_ADDRESS
    return envContract || this.getContractAddress('EstateProxy')
  }

  async getLandOf(address: string): Promise<ICoords[]> {
    const contract = await Ethereum.getContract('LANDProxy')
    let res
    try {
      const [x, y] = await contract['landOf'](address.toUpperCase())
      res = x.map(($, i) => ({ x: $.toNumber(), y: y[i].toNumber() }))
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LANDs: ${e.message}`)
    }
    return res
  }

  async getLandData(x: number, y: number): Promise<ILandData> {
    const contract = await Ethereum.getContract('LANDProxy')
    try {
      const landData = await contract['landData'](x, y)
      return this.decodeLandData(landData)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND data: ${e.message}`)
    }
  }

  async getLandOwner(x: number, y: number): Promise<string> {
    const contract = await Ethereum.getContract('LANDProxy')
    try {
      return await contract['ownerOfLand'](x, y)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND owner: ${e.message}`)
    }
  }

  /**
   * It fails if the owner address isn't able to update given parcel (as an owner or operator)
   */
  async validateAuthorizationOfParcel(owner: string, parcel: ICoords): Promise<void> {
    const isLandOperator = await this.isLandOperator(parcel, owner)
    if (!isLandOperator) {
      fail(ErrorType.ETHEREUM_ERROR, `Provided address ${owner} is not authorized to update LAND ${parcel.x},${parcel.y}`)
    }
  }

  /**
   * It fails if the owner address isn't able to update given estate ID (as an owner or operator)
   */
  async validateAuthorizationOfEstate(owner: string, estateId: number): Promise<void> {
    const isEstateOperator = await this.isEstateOperator(estateId, owner)
    if (!isEstateOperator) {
      fail(ErrorType.ETHEREUM_ERROR, `Provided address ${owner} is not authorized to update Estate ${estateId}`)
    }
  }

  /**
   * It fails if the given parcels aren't inside the given estate
   */
  async validateParcelsInEstate(estateId: number, parcels: ICoords[]): Promise<void> {
    const lands = await this.getLandOfEstate(estateId)
    const incorrectParcel = lands.find(parcel => !parcels.some(p => isEqual(parcel, p)))
    if (incorrectParcel) {
      fail(ErrorType.ETHEREUM_ERROR, `LAND ${incorrectParcel.x},${incorrectParcel.y} is not included at Estate ${estateId}`)
    }
  }

  /**
   * Queries the Blockchain and returns the IPNS return by `landData`
   * @param coordinates An object containing the base X and Y coordinates for the parcel.
   */
  async getIPNS(x: number, y: number): Promise<string> {
    this.emit('ethereum:get-ipns', x, y)

    const landData = await this.getLandData(x, y)

    if (!landData || !landData.ipns) {
      this.emit('ethereum:get-ipns-empty')
      return null
    }

    this.emit('ethereum:get-ipns-success')
    return landData.ipns.replace('ipns:', '')
  }

  private async isLandOperator({ x, y }: ICoords, owner: string): Promise<string> {
    const contract = await Ethereum.getContract('LANDProxy')
    try {
      const assetId = await contract['encodeTokenId'](x, y)
      return await contract['isUpdateAuthorized'](owner, assetId.toString())
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND authorization: ${e.message}`)
    }
  }

  private async isEstateOperator(estateId: number, owner: string): Promise<boolean> {
    const contract = await Ethereum.getContract('EstateProxy')
    try {
      return await contract['isUpdateAuthorized'](owner, estateId)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch Estate authorization: ${e}`)
    }
  }

  private async getLandOfEstate(estateId: number): Promise<ICoords[]> {
    const contract = await Ethereum.getContract('EstateProxy')
    try {
      const estateSize = await contract['getEstateSize'](estateId)
      let promiseParcels = []

      for (let i = 0; i < estateSize; i++) {
        const request = contract['estateLandIds'](estateId, i)
        promiseParcels.push(request)
      }

      const parcels = (await Promise.all(promiseParcels)).map(data => {
        const { id } = this.decodeLandData(data)
        return getObject(id)
      })

      return parcels
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LANDs of Estate: ${e.message}`)
    }
  }

  private decodeLandData(data: string = ''): ILandData {
    // this logic can also be found in decentraland-eth, but we can't rely on node-hid
    const version = data.charAt(0)
    switch (version) {
      case '0': {
        const [id, name, description, ipns] = CSV.parse(data)[0]
        return { id, version: 0, name: name || null, description: description || null, ipns: ipns || null }
      }
      default:
        return null
    }
  }
}
