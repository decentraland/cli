import { buildTypescript, installDependencies, isOnline } from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { success } from '../utils/logging'
import opn = require('opn')
import { ErrorType } from '../utils/errors'

export interface IPreviewArguments {
  options: {
    port?: number
  }
}

export function start(vorpal: any) {
  vorpal
    .command('preview')
    .alias('start')
    .alias('serve')
    .option('-p, --port <number>', 'Parcel previewer server port (default is 2044).')
    .description('Starts local development server.')
    .action(
      wrapCommand(async function(args: IPreviewArguments, callback: () => void) {
        return new Promise(async (resolve, reject) => {
          const dcl = new Decentraland({
            previewPort: args.options.port
          })

          await Analytics.preview()

          dcl.on('preview:ready', url => {
            vorpal.log(success(`Development server running at ${url}`))
            opn(url)
          })

          if (await dcl.project.needsDependencies()) {
            if (await isOnline()) {
              vorpal.log('Installing dependencies...')
              await installDependencies()
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
