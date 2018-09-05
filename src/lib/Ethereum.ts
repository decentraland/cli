import { EventEmitter } from 'events'
import * as fetch from 'isomorphic-fetch'
import * as CSV from 'comma-separated-values'
import { RequestManager, ContractFactory, providers, Contract } from 'eth-connect'

import { isDev, getProvider } from '../utils/env'
import { ErrorType, fail } from '../utils/errors'
import { ICoords, getString, getObject } from '../utils/coordinateHelpers'
const { abi } = require('../../abi/LANDRegistry.json')

const provider = process.env.RPC_URL || getProvider()
const requestManager = new RequestManager(new providers.HTTPProvider(provider))
const factory = new ContractFactory(requestManager, abi)

export interface ILandData {
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
  private static contracts = new Map<string, Contract>()

  static async getContractAddresses(): Promise<any> {
    if (this.contracts) {
      return this.contracts
    }

    try {
      const raw = await fetch('https://contracts.decentraland.org/addresses.json')
      this.contracts = await raw.json()
      return this.contracts
    } catch (error) {
      fail(
        ErrorType.ETHEREUM_ERROR,
        `Unable to fetch decentraland contracts from "https://contracts.decentraland.org/addresses.json", error: ${error.message}`
      )
    }
  }

  static async getContractAddress(name: string): Promise<string> {
    return (await this.getContractAddresses()).data[isDev ? 'ropsten' : 'mainnet'][name]
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

  async getLandOf(address: string): Promise<ICoords[]> {
    let res
    try {
      const contract = await Ethereum.getContract('LANDProxy')
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

  async getLandOperator(x: number, y: number): Promise<string> {
    const contract = await Ethereum.getContract('LANDProxy')
    try {
      const assetId = await contract['encodeTokenId'](x, y)
      return await contract['updateOperator'](assetId)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND operator: ${e.message}`)
    }
  }

  /**
   * It fails if the owner address isn't able to update given parcels (as an owner or operator)
   */
  async validateAuthorization(owner: string, parcels: ICoords[]): Promise<void> {
    const sParcels = parcels.map(getString)
    const ownerParcels = new Set((await this.getLandOf(owner)).map(getString))
    const invalidParcels = sParcels.filter(parcel => !ownerParcels.has(parcel))

    const pParcels = invalidParcels.map(async sParcel => {
      const { x, y } = getObject(sParcel)
      return { x, y, operator: await this.getLandOperator(x, y) }
    })

    const operatorParcels = await Promise.all(pParcels)
    operatorParcels.forEach(({ x, y, operator }) => {
      if (operator !== owner) {
        fail(ErrorType.ETHEREUM_ERROR, `Provided address ${owner} is not authorized to update LAND ${x},${y}`)
      }
    })
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

  private decodeLandData(data: string = ''): ILandData {
    // this logic can also be found in decentraland-eth, but we can't rely on node-hid
    const version = data.charAt(0)
    switch (version) {
      case '0': {
        const [, name, description, ipns] = CSV.parse(data)[0]

        return { version: 0, name: name || null, description: description || null, ipns: ipns || null }
      }
      default:
        return null
    }
  }
}
