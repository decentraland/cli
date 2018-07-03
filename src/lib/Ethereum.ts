import { EventEmitter } from 'events'
import * as fetch from 'isomorphic-fetch'
import * as CSV from 'comma-separated-values'
import { RequestManager, ContractFactory, providers } from 'eth-connect'

import { isDev } from '../utils/env'
import { ErrorType, fail } from '../utils/errors'
import { ICoords, getString, getObject } from '../utils/coordinateHelpers'
const { abi } = require('../../abi/LANDRegistry.json')

const provider = process.env.RPC_URL || (isDev ? 'https://ropsten.infura.io/' : 'https://mainnet.infura.io/')
const requestManager = new RequestManager(new providers.HTTPProvider(provider))
const factory = new ContractFactory(requestManager, abi)
export const landContract = factory.at(isDev ? '0x7a73483784ab79257bb11b96fd62a2c3ae4fb75b' : '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d')

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
  /**
   * Returns the LandProxy contract address.
   * If the LAND_REGISTRY_CONTRACT_ADDRESS is specified, that value will be returned.
   * Otherwise, an external resources will be queried and the address will be resturned based on the DCL_ENV.
   */
  static async getLandContractAddress(): Promise<string> {
    const envContract = process.env.LAND_REGISTRY_CONTRACT_ADDRESS

    if (envContract) {
      return envContract
    }

    try {
      const raw = await fetch('https://contracts.decentraland.org/addresses.json')
      const data = await raw.json()

      if (isDev) {
        return data.ropsten.LANDProxy
      } else {
        return data.mainnet.LANDProxy
      }
    } catch (error) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch land contract: ${error.message}`)
    }
  }

  async getLandOf(address: string): Promise<ICoords[]> {
    let res
    try {
      const contract = await landContract
      const [x, y] = await contract['landOf'](address.toUpperCase())
      res = x.map(($, i) => ({ x: $.toNumber(), y: y[i].toNumber() }))
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LANDs: ${e.message}`)
    }
    return res
  }

  async getLandData(x: number, y: number): Promise<ILandData> {
    let landData

    try {
      const contract = await landContract
      landData = await contract['landData'](x, y)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND data: ${e.message}`)
    }

    return this.decodeLandData(landData)
  }

  async getLandOwner(x: number, y: number): Promise<string> {
    let owner

    try {
      const contract = await landContract
      owner = await contract['ownerOfLand'](x, y)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND owner: ${e.message}`)
    }

    return owner
  }

  async getLandOperator(x: number, y: number): Promise<string> {
    try {
      const contract = await landContract
      const assetId = await contract['encodeTokenId'](x, y)
      return await contract['updateOperator'](assetId)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch LAND operator: ${e.message}`)
    }
  }

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
      if (operator !== owner.toLowerCase()) {
        fail(ErrorType.ETHEREUM_ERROR, `Provided address ${owner.toLowerCase()} is not authorized to update LAND ${x},${y}`)
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

    if (!landData || landData.ipns === '') {
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
