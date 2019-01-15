import { contracts } from 'decentraland-eth'
import { isRopsten } from './config'

const contractInstances: {
  mana?: contracts.MANAToken
  land?: contracts.LANDRegistry
  estate?: contracts.EstateRegistry
} = {}

export function getManaContract() {
  if (!contractInstances.mana) {
    const address = document.currentScript
      ? document.currentScript.getAttribute('mana-token')
      : isRopsten()
      ? '0x2a8fd99c19271f4f04b1b7b9c4f7cf264b626edb'
      : '0x0f5d2fb29fb7d3cfee444a200298f468908cc942'
    contractInstances.mana = new contracts.MANAToken(address)
  }

  return contractInstances.mana
}

export function getLandContract() {
  if (!contractInstances.land) {
    const address = document.currentScript
      ? document.currentScript.getAttribute('land-registry')
      : isRopsten()
      ? '0x7a73483784ab79257bb11b96fd62a2c3ae4fb75bs'
      : '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d'
    contractInstances.land = new contracts.LANDRegistry(address)
  }

  return contractInstances.land
}

export function getEstateContract() {
  if (!contractInstances.estate) {
    const address = document.currentScript
      ? document.currentScript.getAttribute('estate-registry')
      : isRopsten()
      ? '0x124bf28a423b2ca80b3846c3aa0eb944fe7ebb95'
      : '0x959e104e1a4db6317fa58f8295f586e1a978c297'
    contractInstances.estate = new contracts.EstateRegistry(address)
  }

  return contractInstances.estate
}
