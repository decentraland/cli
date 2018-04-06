import { wrapAsync } from '../utils/wrap-async'
import { pinRequest, pinSuccess } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'

export function command(vorpal: any) {
  vorpal
    .command('pin')
    .description('Notifies an external IPFS node to pin local files.')
    .option('-h, --host <string>', 'IPFS daemon API host (default is localhost).')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        const dcl = new Decentraland({
          ipfsHost: args.host || 'localhost',
          ipfsPort: args.port || 500
        })

        dcl.on('pin', async () => {
          await pinRequest()
          vorpal.log(`Pinning files...`)
        })

        dcl.on('pin_complete', async () => {
          await pinSuccess()
          vorpal.log('Files pinned successfully.')
        })

        callback()
      })
    )
}
