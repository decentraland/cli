import { isDev } from '../utils/env'
import axios from 'axios'
import { env, contracts } from 'decentraland-commons'

export class Ethereum {
  private contract = new contracts.LANDRegistry()

  async getLandContractAddress(): Promise<string> {
    try {
      const { data } = await axios.get('https://contracts.decentraland.org/addresses.json')

      if (isDev) {
        return data.ropsten.LANDProxy
      } else {
        return data.mainnet.LANDProxy
      }
    } catch (error) {
      const fallback = env.get('LAND_REGISTRY_CONTRACT_ADDRESS')

      if (fallback) {
        return fallback
      }

      throw new Error(`Unable to fetch land contract: ${error.message}`)
    }
  }

  async hasIPNS(coordinates: { x: number; y: number }): Promise<boolean> {
    const landData = await this.contract.call('landData', coordinates.x, coordinates.y)
    console.log(landData)
    const { ipns } = contracts.LANDRegistry.decodeLandData(landData)
    console.log(ipns)

    return ipns ? true : false
  }
}
