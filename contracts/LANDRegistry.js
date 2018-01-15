import ethereum from 'decentraland-commons';
import { abi } from '../contracts/LANDRegistry.json';

let instance = null

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

    ownerOfLandMany(x, y) {
      return this.call('ownerOfLandMany', x, y)
    }

    landData(x, y) {
      return this.call('landData', x, y)
    }

    updateManyLandData(x, y, data) {
      return this.transaction('updateManyLandData', x, y, data)
    }
}
