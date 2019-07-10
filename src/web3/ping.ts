import { getDateFromString, getDurationBetweenDates } from '../utils/dates'
import { getDecayedAssetAuction, getLANDRegistry } from './contracts'

export const GRACE_PERIOD = 30
export const NEAR_DECAY = 7

export type LANDPingResponse = {
  lastActive: Date
  hasDecayed: boolean
  isNearDecay?: boolean
  timeSinceLastActive: number
  timeSinceDecay?: number
  price?: number
}

export async function ping(x: number, y: number): Promise<LANDPingResponse> {
  const contract = await getLANDRegistry()
  const sLastActive: string = await contract['lastActive'](x, y)

  const now = new Date()
  // TODO use encodeTokenId if necessary
  // TODO transform from real contract format
  const lastActive = getDateFromString(sLastActive)

  const timeSinceLastActive = getDurationBetweenDates(lastActive, now)
  const hasDecayed = timeSinceLastActive > GRACE_PERIOD
  const isNearDecay = timeSinceLastActive > GRACE_PERIOD - NEAR_DECAY

  if (hasDecayed) {
    const aux = new Date(lastActive.getTime())
    aux.setDate(aux.getDate() + GRACE_PERIOD)
    const timeSinceDecay = getDurationBetweenDates(aux, now)

    const auctionContract = await getDecayedAssetAuction()
    // TODO use encodeTokenId if necessary
    // TODO apply real transformation from MANA ammount format
    const price = await auctionContract['getPriceOf'](x, y)

    return {
      lastActive,
      hasDecayed,
      isNearDecay,
      timeSinceLastActive,
      timeSinceDecay,
      price
    }
  }

  return {
    lastActive,
    hasDecayed,
    timeSinceLastActive
  }
}
