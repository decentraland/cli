import { contracts } from 'decentraland-eth'
import { manaContract, landContract } from './modules/config'

const MANAToken = new contracts.MANAToken(manaContract)
const LANDRegistry = new contracts.LANDRegistry(landContract)

export { MANAToken, LANDRegistry }
