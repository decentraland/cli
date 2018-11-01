import { Coords, LANDMeta } from './types'

/**
 * Converts a Coords object to a string-based set of coordinates
 */
export function getString({ x, y }: Coords): string {
  return `${x},${y}`
}

export function isEqual(p1: Coords, p2: Coords): boolean {
  return p1.x === p2.x && p1.y === p2.y
}

export function getEmptyLandData(): LANDMeta {
  return {
    version: 0,
    name: '',
    description: ''
  }
}
