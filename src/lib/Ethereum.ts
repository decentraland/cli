import { isDev } from '../utils/env'
import * as fetch from 'isomorphic-fetch'
import { EventEmitter } from 'events'
import { ErrorType, fail } from '../utils/errors'
import * as CSV from 'comma-separated-values'
const { landRegistryABI } = require('../../abi/LANDRegistry.json')
import { RequestManager, ContractFactory, providers } from 'eth-connect'

const provider = process.env.RPC_URL || (isDev ? 'https://ropsten.infura.io/' : 'https://mainnet.infura.io/')
const requestManager = new RequestManager(new providers.HTTPProvider(provider))
const landRegistryFactory = new ContractFactory(requestManager, landRegistryABI)

// TODO: Warning, the `at` method might have side-effects and this line might lead to race conditions
export const landContract = landRegistryFactory.at(isDev
  ? '0x7a73483784ab79257bb11b96fd62a2c3ae4fb75b'
  : '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d'
)

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

  /**
   * Queries the Blockchain and returns the IPNS return by `landData`
   * @param coordinates An object containing the base X and Y coordinates for the parcel.
   */
  async getIPNS(coordinates: { x: number; y: number }) {
    let landData

    this.emit('ethereum:get-ipns', coordinates)

    try {
      const contract = await landContract
      landData = await contract['landData'](coordinates.x, coordinates.y)
    } catch (e) {
      fail(ErrorType.ETHEREUM_ERROR, `Unable to fetch land data: ${e.message}`)
    }

    if (landData.trim() === '') {
      this.emit('ethereum:get-ipns-empty')
      return null
    }

    const { ipns } = this.decodeLandData(landData)

    this.emit('ethereum:get-ipns-success')
    return ipns.replace('ipns:', '')
  }

  private decodeLandData(data: string = ''): { version: number; name: string; description: string; ipns: string } {
    // this logic can also be found in decentraland-eth, but we can't rely on node-hid
    const version = data.charAt(0)
    switch (version) {
      case '0': {
        const [, name, description, ipns] = CSV.parse(data)[0]

        return {
          version: 0,
          name: name || '',
          description: description || '',
          ipns: ipns || ''
        }
      }
      default:
        fail(ErrorType.ETHEREUM_ERROR, `Unknown version '${version}' when trying to decode land data`)
        break
    }
  }
}
