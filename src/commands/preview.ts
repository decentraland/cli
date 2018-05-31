import { buildTypescript, installDependencies, isOnline } from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { info, comment, loading } from '../utils/logging'
import opn = require('opn')
import { ErrorType } from '../utils/errors'

export interface IArguments {
  options: {
    port?: number
  }
}

export function start(vorpal: any) {
  vorpal
    .command('preview')
    .alias('start')
    .alias('serve')
    .option('-p, --port <number>', 'parcel previewer server port (default is 2044).')
    .description('Starts local development server.')
    .action(
      wrapCommand(async function(args: IArguments) {
        return new Promise(async (resolve, reject) => {
          const dcl = new Decentraland({
            previewPort: args.options.port
          })

          await Analytics.preview()

          dcl.on('preview:ready', url => {
            vorpal.log('') // padding
            info(`Development server running at ${url}`)
            vorpal.log(comment('Press CTRL+C to exit'))
            vorpal.log('') // padding
            opn(url)
          })

          if (await dcl.project.needsDependencies()) {
            if (await isOnline()) {
              const spinner = loading('Installing dependencies')
              await installDependencies(true)
              spinner.succeed()
            } else {
              const e = new Error('Unable to install dependencies: no internet connection')
              e.name = ErrorType.PREVIEW_ERROR
              reject(e)
            }
          }

          if (await dcl.project.isTypescriptProject()) {
            await buildTypescript()
          }

          await dcl.preview()
        })
      })
    )
}
