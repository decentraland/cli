import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { loading } from '../utils/logging'

export interface IArguments {
  options: {
    host?: string
    port?: number
  }
}

export function pin(vorpal: any) {
  vorpal
    .command('pin')
    .description('Notifies an external IPFS node to pin local files.')
    .option('-h, --host <string>', 'IPFS daemon API host (default is localhost).')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .action(
      wrapCommand(async (args: IArguments) => {
        const dcl = new Decentraland({
          ipfsHost: args.options.host || 'localhost',
          ipfsPort: args.options.port || 5001
        })

        dcl.on('ipfs:pin', () => {
          Analytics.pinRequest()
          const spinner = loading(`Pinning files to IPFS gateway`)

          dcl.on('ipfs:pin-success', () => {
            Analytics.pinSuccess()
            spinner.succeed()
          })
        })

        await dcl.pin()
      })
    )
}
