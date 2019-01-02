import { contracts } from 'decentraland-eth'
import { manaContract, landContract, estateContract } from './config'

export const MANAToken = new contracts.MANAToken(manaContract)
export const LANDRegistry = new contracts.LANDRegistry(landContract)
export const EstateRegistry = new contracts.EstateRegistry(estateContract)
