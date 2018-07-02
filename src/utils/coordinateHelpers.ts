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
export function getObject(coords: string): { x: number; y: number } {
  const parsed = parse(coords)[0]
  const [x, y] = parsed.split(',')
  return { x: parseInt(x, 10), y: parseInt(y, 10) }
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
  return areConnectedRecursive(parcels)
}

function areConnectedRecursive(parcels: ICoords[], alreadyTraveled = [], stack = [...parcels]): boolean {
  if (alreadyTraveled.length === parcels.length) {
    return true
  }

  if (stack.length === 0) {
    return false
  }

  const { x, y } = stack.pop()

  const neighbours = getAdjacentsFrom(x, y, parcels).filter(coords => {
    return parcels.some(coords2 => isEqual(coords, coords2)) && !alreadyTraveled.some(coords2 => isEqual(coords, coords2))
  })

  return areConnectedRecursive(parcels, [...alreadyTraveled, ...neighbours], stack)
}

function getAdjacentsFrom(x: number, y: number, parcels: ICoords[]) {
  return parcels.filter(coords => isAdjacent(x, y, coords))
}

function isAdjacent(x: number, y: number, coords: ICoords): boolean {
  return (coords.x === x && (coords.y + 1 === y || coords.y - 1 === y)) || (coords.y === y && (coords.x + 1 === x || coords.x - 1 === x))
}

export function isEqual(p1: ICoords, p2: ICoords): boolean {
  return p1.x === p2.x && p1.y === p2.y
}
