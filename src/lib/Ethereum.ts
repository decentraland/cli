import { isDev } from '../utils/env'
import axios from 'axios'
import { contracts, eth } from 'decentraland-eth'
import { env } from 'decentraland-commons/dist/env'
import { EventEmitter } from 'events'

/**
 * Events emitted by this class:
 *
 * ethereum:get-ipns-request - An attempt to load landData from the ethereum blockchain
 * ethereum:get-ipns-success - Successfully fetched and parsed landData
 */
export class Ethereum extends EventEmitter {
  static isConnected: boolean = false

  static async connect() {
    const address = await Ethereum.getLandContractAddress()
    const land = new contracts.LANDRegistry(address)
    const providerUrl = env.get('RPC_URL', () => (isDev ? 'https://ropsten.infura.io/' : 'https://mainnet.infura.io/'))

    if (!Ethereum.isConnected) {
      try {
        Ethereum.isConnected = await eth.connect({
          contracts: [land],
          providerUrl
        })
      } catch (e) {
        throw new Error('Unable to connect to the Ethereum Blockchain')
      }

      return land
    }
  }

  static async getLandContractAddress(): Promise<string> {
    const envContract = env.get('LAND_REGISTRY_CONTRACT_ADDRESS')
    if (envContract) {
      return envContract
    }

    try {
      const { data } = await axios.get('https://contracts.decentraland.org/addresses.json')

      if (isDev) {
        return data.ropsten.LANDProxy
      } else {
        return data.mainnet.LANDProxy
      }
    } catch (error) {
      throw new Error(`Unable to fetch land contract: ${error.message}`)
    }
  }

  async getIPNS(coordinates: { x: number; y: number }) {
    const contract = (await this.getContractInstance()) as any
    let landData

    this.emit('ethereum:get-ipns-request', coordinates)

    try {
      landData = await contract.landData(coordinates.x, coordinates.y)
    } catch (e) {
      throw new Error(`Unable to fetch land data: ${e.message}`)
    }

    if (landData.trim() === '') {
      return null
    }

    this.emit('ethereum:get-ipns-success')

    const { ipns } = contracts.LANDRegistry.decodeLandData(landData)
    return ipns.replace('ipns:', '')
  }

  private getContractInstance(): contracts.LANDRegistry {
    try {
      return eth.getContract('LANDRegistry')
    } catch (e) {
      throw new Error(`Unable to get LANDRegistry contract instance`)
    }
  }
}
