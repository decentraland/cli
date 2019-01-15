import { Coords } from './modules/land/types'

export const env = document.currentScript.getAttribute('env')

let net
export function setNetwork(network: string) {
  net = network
}

export const owner = document.currentScript.getAttribute('owner')
export const baseParcel = JSON.parse(
  document.currentScript.getAttribute('base-parcel')
) as Coords
export const parcels = JSON.parse(
  document.currentScript.getAttribute('parcels')
) as Coords[]
export const rootCID = document.currentScript.getAttribute('root-cid')

export function isDevelopment(): boolean {
  return env === 'dev'
}

export function isRopsten(): boolean {
  return net === 'ropsten'
}
