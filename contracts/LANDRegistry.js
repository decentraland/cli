import ethereum from 'decentraland-commons';
import { abi } from '../contracts/LANDRegistry.json';

let instance = null
const DEVELOPMENT_CONTRACT = '0x8cdaf0cd259887258bc13a92c0a6da92698644c0';

export default class LANDRegistry extends ethereum.Contract {
    static getInstance() {
      if (! instance) {
        instance = new LANDRegistry(
          'LANDRegistry',
          "0x9519216b1d15a91e71e8cfa17cc45bcc7707e500",
          abi
        )
      }
      return instance
    }

    getOwner(x, y) {
      return this.call('ownerOfLand', x, y)
    }

    ownerOfLandMany(x, y) {
      return this.call('ownerOfLandMany', x, y)
    }

    landData(x, y) {
      return this.call('landData', x, y)
    }

    updateManyLandData(x, y, data) {
      return this.transaction('updateManyLandData', x, y, data)
    }

    assignMultipleParcels(x, y, address, opts = {}) {
      return this.transaction(
        'assignMultipleParcels',
        x,
        y,
        address,
        Object.assign({}, { gas: 1000000, gasPrice: 28 * 1e9 }, opts)
      )
    }
}
