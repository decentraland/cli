import { exit, warning } from './logging'
import { Analytics, finishPendingTracking } from './analytics'
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

export interface IArguments {
  options: {
    ci?: boolean
  }
}

async function wrapper(fn: TargetFunction, ctx: any, args: IArguments): Promise<void> {
  if (args.options.ci) {
    await Analytics.requestPermission()
  }

  try {
    await fn.call(ctx, args)
    await finishPendingTracking()
  } catch (e) {
    await Analytics.reportError(e.name, e.message, e.stack)
    exit(e, ctx)
  }

  if (await isCLIOutdated()) {
    ctx.log(warning('\nWARNING: outdated decentraland version\nPlease run ') + 'npm update -g decentraland\n')
  }

  if (await isMetaverseApiOutdated()) {
    ctx.log(warning('\nWARNING: outdated decentraland-api version\nPlease run ') + 'npm install decentraland-api@latest\n')
  }
}
