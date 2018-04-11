import { buildTypescript } from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { success } from '../utils/logging'
const opn = require('opn')

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

          if (await dcl.project.isTypescriptProject()) {
            await buildTypescript()
          }

          await dcl.preview()
        })
      })
    )
}
