import { eth, contracts } from 'decentraland-eth'
import { ICoords } from '../utils/coordinateHelpers'
import { Server } from './Server'

const ERRORS_MESSAGES = {
  unlock: 'Please unlock your wallet to continue',
  notSameOwner: "Project owner ({owner}) isn't the same as Metamask address ({address})",
  noConnection: 'Could not connect to Ethereum'
}

export class Ethereum {
  private land
  private address

  async init(owner: string) {
    try {
      const contractAddress = await Server.getContractAddress()
      this.land = new contracts.LANDRegistry(contractAddress)
      await eth.connect({ contracts: [this.land] })

      if (typeof eth.wallet.getAccount() !== 'string') {
        throw new Error(ERRORS_MESSAGES.unlock)
      }

      this.address = await eth.getAddress()
      if (this.address !== owner) {
        throw new Error(ERRORS_MESSAGES.notSameOwner.replace('{address}', this.address).replace('{owner}', owner))
      }
    } catch ({ message }) {
      throw new Error(message || ERRORS_MESSAGES.noConnection)
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
