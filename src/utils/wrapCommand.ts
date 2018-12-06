import { exit, warning, formatOutdatedMessage } from './logging'
import { Analytics, finishPendingTracking } from './analytics'
import { getOutdatedApi, isCLIOutdated } from './moduleHelpers'
import { getOrElse } from '.'
import { isEnvCi } from './env'

type TargetFunction = (args: any, callback: () => void) => Promise<any>
type WrappedFunction = (this: any, args: any, callback: () => void) => void

export function wrapCommand(fn: TargetFunction): WrappedFunction {
  return function(args, cb) {
    wrapper(fn, this, args)
      .then(() => {
        cb()
      })
      .catch(err => {
        // tslint:disable-next-line:no-console
        console.error(err)
        process.exit(1)
      })
  }
}

export interface IArguments {
  options: {
    ci?: boolean
  }
}

function isCi(args: IArguments) {
  return getOrElse(args.options.ci, isEnvCi())
}

async function wrapper(fn: TargetFunction, ctx: any, args: IArguments): Promise<void> {
  if (!isCi(args)) {
    await Analytics.requestPermission()
  }

  if (await isCLIOutdated()) {
    ctx.log(warning('\nWARNING: outdated decentraland version\nPlease run ') + 'npm update -g decentraland\n')
  }

  const outatedAPI = await getOutdatedApi()
  if (outatedAPI) {
    ctx.log(warning(formatOutdatedMessage(outatedAPI)))
  }

  try {
    await fn.call(ctx, args)
    await finishPendingTracking()
  } catch (e) {
    await Analytics.reportError(e.name, e.message, e.stack)
    exit(e, ctx)
  }
}
