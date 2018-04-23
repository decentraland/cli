/**
 * Parses a string-based set of coordinates.
 * - All spaces are removed
 * - Leading zeroes are removed
 * - `-0` is converted to `0`
 * @param coordinates An string containing coordinates in the `x,y; x,y; ...` format
 */
export function parseCoordinates(coordinates: string): string[] {
  return coordinates.split(';').map((coord: string) => {
    const [x, y] = coord.split(',').map($ => {
      return parseInt($, 10)
        .toString()
        .replace('-0', '0')
    })
    return `${x},${y}`
  })
}
