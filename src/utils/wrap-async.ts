import { exit } from './logging'

export function wrapAsync(
  fn: (args: any, callback: () => void) => Promise<any>
): (this: any, args: any, callback: () => void) => void {
  return function(args, cb) {
    fn
      .call(this, args, cb)
      .then(val => cb())
      .catch(e => {
        exit(e.message, this)
      })
  }
}
