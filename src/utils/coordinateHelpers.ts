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
  const parts = parsed.split(',')
  return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) }
}
