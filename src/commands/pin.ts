import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { success } from '../utils/logging'

export interface IPinArguments {
  options: {
    host?: string
    port?: number
  }
}

export function command(vorpal: any) {
  vorpal
    .command('pin')
    .description('Notifies an external IPFS node to pin local files.')
    .option('-h, --host <string>', 'IPFS daemon API host (default is localhost).')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .action(
      wrapCommand(async function(args: IPinArguments, callback: () => void) {
        const dcl = new Decentraland({
          ipfsHost: args.options.host || 'localhost',
          ipfsPort: args.options.port || 5001
        })

        dcl.on('ipfs:pin-request', async () => {
          await Analytics.pinRequest()
          vorpal.log(`Pinning files...`)
        })

        dcl.on('ipfs:pin-success', async () => {
          await Analytics.pinSuccess()
          vorpal.log(success('Files pinned successfully.'))
        })

        await dcl.pin()

        callback()
      })
    )
}
