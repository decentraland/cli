import { Contract } from '@ethersproject/contracts'
import { createEth } from 'decentraland-dapps/dist/lib/eth'
import { Web3Provider } from '@ethersproject/providers'

import * as EstateRegistry from './abis/EstateRegistry.json'
import * as LANDRegistry from './abis/LANDRegistry.json'
import { isRopsten } from './config'

const contractInstances: {
  land?: Contract
  estate?: Contract
} = {}

export async function getLandContract() {
  if (!contractInstances.land) {
    const eth = await createEth()
    if (eth) {
      const address = document.currentScript
        ? document.currentScript.getAttribute('land-registry')
        : isRopsten()
        ? '0x7a73483784ab79257bb11b96fd62a2c3ae4fb75b'
        : '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d'

      contractInstances.land = new Contract(
        address,
        LANDRegistry.abi,
        new Web3Provider(eth.provider['provider']).getSigner()
      )
    }
  }

  return contractInstances.land
}

export async function getEstateContract() {
  if (!contractInstances.estate) {
    const eth = await createEth()
    if (eth) {
      const address = document.currentScript
        ? document.currentScript.getAttribute('estate-registry')
        : isRopsten()
        ? '0x124bf28a423b2ca80b3846c3aa0eb944fe7ebb95'
        : '0x959e104e1a4db6317fa58f8295f586e1a978c297'
      contractInstances.estate = new Contract(
        address,
        EstateRegistry.abi,
        new Web3Provider(eth.provider['provider']).getSigner()
      )
    }
  }

  return contractInstances.estate
}
