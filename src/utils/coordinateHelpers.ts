export interface IBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface ICoords {
  x: number
  y: number
}

/**
 * Returns metaverse coordinates bounds.
 */
export function getBounds(): IBounds {
  return {
    minX: -150,
    minY: -150,
    maxX: 150,
    maxY: 150
  }
}

/**
 * Parses a string-based set of coordinates.
 * - All spaces are removed
 * - Leading zeroes are removed
 * - `-0` is converted to `0`
 * @param coordinates An string containing coordinates in the `x,y; x,y; ...` format
 */
export function parse(coordinates: string): string[] {
  return coordinates.split(';').map((coord: string) => {
    const [x = 0, y = 0] = coord.split(',').map($ => {
      return parseInt($, 10)
        .toString() // removes spaces :)
        .replace('-0', '0')
        .replace(/undefined|NaN/g, '0')
    })
    return `${x},${y}`
  })
}

/**
 * Returns a promise that resolves `true` if the given set of coordinates is valid.
 * For invalid coordinates, the promise will reject with an error message.
 * *This is meant to be used as an inquirer validator.*
 *
 * Empty inputs will resolve `true`
 * @param answers An string containing coordinates in the `x,y; x,y; ...` format
 */
export function validate(answers: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (answers.trim().length === 0) {
      resolve(true)
    } else {
      answers.split(/;\s/g).forEach(answer => {
        if (!isValid(answer)) {
          reject(new Error(`Invalid coordinate ${answer}`))
        }
      })
      resolve(true)
    }
  })
}

/**
 * Returns true if the given coordinate's format is valid
 *
 * ```
 * isValid('0,0') // returns true
 * isValid(', 0') // returns false
 * ```
 * @param val The coodinate string
 */
export function isValid(val: string): boolean {
  if (!val.match(/^(-?\d)+\,(-?\d)+$/g)) {
    return false
  }
  return true
}

/**
 * Converts a string-based set of coordinates to an object
 * @param coords A string containing a set of coordinates
 */
export function getObject(coords: string): ICoords {
  const parsed = parse(coords)[0]
  const [x, y] = parsed.split(',')
  return { x: parseInt(x, 10), y: parseInt(y, 10) }
}

/**
 * Converts a ICoords object to a string-based set of coordinates
 */
export function getString({ x, y }: ICoords): string {
  return `${x},${y}`
}

/**
 * Returns true if the given coordinates are in metaverse bounds
 */
export function inBounds(x: number, y: number): boolean {
  const { minX, minY, maxX, maxY } = getBounds()
  return x >= minX && x <= maxX && y >= minY && y <= maxY
}

/**
 * Returns true if the given parcels array are connected
 */
export function areConnected(parcels: ICoords[]): boolean {
  if (parcels.length === 0) {
    return false
  }
  const visited = visitParcel(parcels[0], parcels)
  return visited.length === parcels.length
}

function visitParcel(parcel: ICoords, allParcels: ICoords[] = [parcel], visited: ICoords[] = []): ICoords[] {
  let isVisited = visited.some(visitedParcel => isEqual(visitedParcel, parcel))
  if (!isVisited) {
    visited.push(parcel)
    let neighbours = getNeighbours(parcel.x, parcel.y, allParcels)
    neighbours.forEach(neighbours => visitParcel(neighbours, allParcels, visited))
  }
  return visited
}

function getIsNeighbourMatcher(x: number, y: number) {
  return (coords: ICoords) =>
    (coords.x === x && (coords.y + 1 === y || coords.y - 1 === y)) || (coords.y === y && (coords.x + 1 === x || coords.x - 1 === x))
}

function getNeighbours(x: number, y: number, parcels: ICoords[]): ICoords[] {
  return parcels.filter(getIsNeighbourMatcher(x, y))
}

export function isEqual(p1: ICoords, p2: ICoords): boolean {
  return p1.x === p2.x && p1.y === p2.y
}
