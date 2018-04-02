import { wrapAsync } from '../utils/wrap-async'
import { IPFS } from '../lib/IPFS'
import { Project } from '../lib/Project'
import { success } from '../utils/logging'
import { pinRequest, pinSuccess } from '../utils/analytics'

export function pin(vorpal: any) {
  vorpal
    .command('pin')
    .description('Notifies an external IPFS node to pin local files.')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        const localIPFS = new IPFS()
        const project = new Project()
        await project.validateExistingProject()

        localIPFS.on('pin', async () => {
          await pinRequest()
          vorpal.log(`Pinning files...`)
        })

        localIPFS.on('pin_complete', async () => {
          await pinSuccess()
          vorpal.log(success('Files pinned successfully.'))
        })

        const coords = await project.getParcelCoordinates()
        const peerId = await localIPFS.getPeerId()

        await localIPFS.pinFiles(peerId, coords)

        callback()
      })
    )
}
