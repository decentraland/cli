export interface ICoords {
  x: number
  y: number
}

/**
 * Converts a ICoords object to a string-based set of coordinates
 */
export function getString({ x, y }: ICoords): string {
  return `${x},${y}`
}

export function isEqual(p1: ICoords, p2: ICoords): boolean {
  return p1.x === p2.x && p1.y === p2.y
}
