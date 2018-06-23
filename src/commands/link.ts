import { wrapCommand } from '../utils/wrapCommand'
import { Decentraland } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { loading } from '../utils/logging'
import opn = require('opn')
import { ErrorType, fail } from '../utils/errors'

export interface IArguments {
  options: {
    port?: number
  }
}

export function link(vorpal: any) {
  vorpal
    .command('link')
    .description('Link scene to Ethereum.')
    .option('-p, --port <number>', 'linker app server port (default is 4044).')
    .action(
      wrapCommand(async function(args: IArguments) {
        const dcl = new Decentraland({
          linkerPort: args.options.port
        })

        dcl.on('link:ready', async url => {
          await Analytics.sceneLink()
          const linkerMsg = loading(`Linking app ready at ${url}`)
          try {
            opn(url)
          } catch (error) {
            linkerMsg.info('Could not open browser automatically.')
          }

          dcl.on('link:success', async () => {
            await Analytics.sceneLinkSuccess()
            linkerMsg.succeed('Project successfully updated in LAND Registry')
            process.exit(1)
          })

          dcl.on('link:error', async (error) => {
            linkerMsg.info('Linker app error: ' + error.message)
            linkerMsg.info(`Press Ctrl+C to exit, or try to link again from ${url}`)
          })
        })

        try {
          await dcl.link()
        } catch (e) {
          fail(ErrorType.LINKER_ERROR, e.message)
        }
      })
    )
}
