import { exit, highlight } from './logging'
import { Analytics } from './analytics'
import { isMetaverseApiOutdated, isCLIOutdated } from './moduleHelpers'

export function wrapCommand(fn: (args: any, callback: () => void) => Promise<any>): (this: any, args: any, callback: () => void) => void {
  return function(args, cb) {
    isMetaverseApiOutdated().then(isOutdated => {
      if (isOutdated) {
        this.log(highlight('WARNING: outdated metaverse-api version\nPlease run ') + 'npm update metaverse-api')
      }
    })

    isCLIOutdated().then(isOutdated => {
      if (isOutdated) {
        this.log(highlight('WARNING: outdated decentraland version\nPlease run ') + 'npm update -g decentraland')
      }
    })

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
