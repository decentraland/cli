import { wrapCommand } from '../utils/wrapCommand'
import { Decentraland } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { success, info } from '../utils/logging'
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
          info(`Linking app ready at ${url}`)
          opn(url)
        })

        dcl.on('link:success', async () => {
          await Analytics.sceneLinkSuccess()
          success('Project successfully linked to the blockchain')
          process.exit(1)
        })

        try {
          await dcl.link()
        } catch (e) {
          fail(ErrorType.LINKER_ERROR, e.message)
        }
      })
    )
}
