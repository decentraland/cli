import { contracts } from 'decentraland-eth'
import { manaContract, landContract } from './modules/config'

export const MANAToken = new contracts.MANAToken(manaContract)
export const LANDRegistry = new contracts.LANDRegistry(landContract)
