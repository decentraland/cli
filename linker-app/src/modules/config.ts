import { Coords } from './land/types'

// TODO configuration properties should be initialized via a saga and exposed on state
export const env = document.currentScript.getAttribute('env')
export const provider = document.currentScript.getAttribute('provider')

export const manaContract = document.currentScript.getAttribute('mana-contract')
export const landContract = document.currentScript.getAttribute('land-contract')
export const estateContract = document.currentScript.getAttribute('estate-contract')

export const owner = document.currentScript.getAttribute('owner')
export const baseParcel = JSON.parse(document.currentScript.getAttribute('base-parcel')) as Coords
export const parcels = JSON.parse(document.currentScript.getAttribute('parcels')) as Coords[]
export const estateId = JSON.parse(document.currentScript.getAttribute('estate-id')) as number
export const ipfsKey = document.currentScript.getAttribute('ipfs-key')
export const rootCID = document.currentScript.getAttribute('root-cid')

export function isDevelopment(): boolean {
  return env === 'dev'
}

export function isEstate(): boolean {
  return !!estateId
}
