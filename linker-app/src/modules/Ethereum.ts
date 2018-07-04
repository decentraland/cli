import { eth, contracts } from 'decentraland-eth'
import { ICoords } from '../utils/coordinateHelpers'
import { Server } from './Server'

const ERRORS_MESSAGES = {
  unlock: 'Please unlock your wallet to continue',
  noConnection: 'Could not connect to Ethereum'
}

export class Ethereum {
  private land
  private address

  async init() {
    try {
      this.address = await Server.getContractAddress()
      this.land = new contracts.LANDRegistry(this.address)
      await eth.connect({ contracts: [this.land] })
    } catch ({ message }) {
      throw new Error(typeof eth.wallet.getAccount() !== 'string' ? ERRORS_MESSAGES.unlock : message || ERRORS_MESSAGES.noConnection)
    }
  }

  getAddress() {
    return this.address
  }

  async getLandData(x: number, y: number) {
    try {
      const landData = await this.land.landData(x, y)
      return contracts.LANDRegistry.decodeLandData(landData)
    } catch (e) {
      throw new Error('landData error')
    }
  }

  async updateLand(base: ICoords, parcels: ICoords[]): Promise<string> {
    const { x, y } = base
    const oldData = await this.getLandData(x, y)
    const { name, description } = oldData
    const ipfsKey = await Server.getIPFSKey()
    const data = contracts.LANDRegistry.encodeLandData({
      version: 0,
      name,
      description,
      ipns: `ipns:${ipfsKey}`
    })
    try {
      return await this.land.updateManyLandData(parcels, data)
    } catch (err) {
      throw new Error('Transaction rejected')
    }
  }
}
