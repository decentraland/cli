import { wrapAsync } from '../utils/wrap-async'
import { Decentraland } from '../lib/Decentraland'
import { sceneLink, sceneLinkSuccess } from '../utils/analytics'
import { success, notice } from '../utils/logging'
import opn = require('opn')

export function command(vorpal: any) {
  vorpal
    .command('link')
    .description('Link scene to Ethereum.')
    .option('-p, --port <number>', 'Linker app server port (default is 4044).')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        const dcl = new Decentraland()

        dcl.on('link:ready', async url => {
          await sceneLink()
          vorpal.log(notice('Linking app ready.'))
          vorpal.log(`Please proceed to ${url}`)
          opn(url)
        })

        dcl.on('link:success', async () => {
          await sceneLinkSuccess()
          vorpal.log(success('Project successfully linked to the blockchain'))
        })

        await dcl.link(args.port)
      })
    )
}
