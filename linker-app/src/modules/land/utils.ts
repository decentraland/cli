import { LANDMeta, Coords } from './types'

export function getEmptyLandData(): LANDMeta {
  return {
    version: 0,
    name: '',
    description: ''
  }
}

export function coordsToString({ x, y }: Coords): string {
  return `${x},${y}`
}
