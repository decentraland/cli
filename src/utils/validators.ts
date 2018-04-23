/**
 * Returns a promise that resolves `true` if the given set of coordinates is valid.
 * For invalid coordinates, the promise will reject with an error message.
 * This is meant to be used as an inquirer validator.
 *
 * Empty inputs will resolve `true`
 * @param answers An string containing coordinates in the `x,y; x,y; ...` format
 */
export function validateCoordinates(answers: string) {
  return new Promise((resolve, reject) => {
    if (answers.trim().length === 0) {
      resolve(true)
    } else {
      answers.split(/;\s/g).forEach(answer => {
        if (!answer.match(/^(-?\d)+\,(-?\d)+$/g)) {
          reject(new Error(`Invalid coordinate ${answer}`))
        }
      })
      resolve(true)
    }
  })
}
