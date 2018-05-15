import { exit, highlight } from './logging'
import { Analytics } from './analytics'
import { isMetaverseApiOutdated, isCLIOutdated } from './moduleHelpers'

type TargetFunction = (args: any, callback: () => void) => Promise<any>
type WrappedFunction = (this: any, args: any, callback: () => void) => void

export function wrapCommand(fn: TargetFunction): WrappedFunction {
  return function(args, cb) {
    wrapper(fn, this, args).then(() => {
      cb()
    })
  }
}

async function wrapper(fn: TargetFunction, ctx: any, args: any[]): Promise<void> {
  await Analytics.requestPermission()

  try {
    await fn.call(ctx, args)
  } catch (e) {
    await Analytics.reportError(e.name, e.message, e.stack)
    exit(e.message, ctx)
  }

  if (await isCLIOutdated()) {
    this.log(highlight('\nWARNING: outdated decentraland version\nPlease run ') + 'npm update -g decentraland\n')
  }

  if (await isMetaverseApiOutdated()) {
    this.log(highlight('\nWARNING: outdated metaverse-api version\nPlease run ') + 'npm install metaverse-api@latest\n')
  }
}
