import { exit } from './logging'
import { Analytics } from './analytics'

export function wrapCommand(fn: (args: any, callback: () => void) => Promise<any>): (this: any, args: any, callback: () => void) => void {
  return function(args, cb) {
    fn
      .call(this, args, cb)
      .then(val => cb())
      .catch((e: Error) => {
        Analytics.reportError(e.name, e.message, e.stack).then(() => {
          exit(e.message, this)
        })
      })
  }
}
