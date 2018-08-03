import { wrapCommand } from '../utils/wrapCommand'
import { Decentraland } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { loading, warning } from '../utils/logging'
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
      wrapCommand(async (args: IArguments) => {
        const dcl = new Decentraland({
          linkerPort: args.options.port
        })

        dcl.on('link:ready', url => {
          Analytics.sceneLink()
          const linkerMsg = loading(`Linking app ready at ${url}`)

          try {
            opn(url)
          } catch (e) {
            vorpal.log(warning(`WARNING: Unable to open browser automatically`))
          }

          dcl.on('link:success', async () => {
            Analytics.sceneLinkSuccess()
            linkerMsg.succeed('Project successfully updated in LAND Registry')
            process.exit(1)
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
