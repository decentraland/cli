import { wrapAsync } from '../utils/wrap-async'
import { success, notice } from '../utils/logging'
import { sceneUpload, sceneUploadSuccess, sceneLinkSuccess, sceneLink } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import opn = require('opn')

export interface IDeployArguments {
  host?: string
  port?: number
}

export function deploy(vorpal: any) {
  vorpal
    .command('deploy')
    .alias('upload')
    .description('Uploads scene to IPFS and updates IPNS.')
    .option('-h, --host <string>', 'IPFS daemon API host (default is localhost).')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .action(
      wrapAsync(async function(args: IDeployArguments, callback: () => void) {
        const dcl = new Decentraland({
          ipfsHost: args.host || 'localhost',
          ipfsPort: args.port || 500
        })

        dcl.on('ipfs:add-progress', (bytes, files, total) => {
          vorpal.log(`Uploading ${files}/${total} files to IPFS (${bytes} bytes uploaded)`)
        })

        dcl.on('ipfs:add-success', () => {
          vorpal.log('Successfully added files to local IPFS node')
        })

        dcl.on('ethereum:get-ipns-request', (x, y) => {
          vorpal.log(`Checking IPNS for coordinates ${x}, ${y}`)
        })

        dcl.on('ethereum:get-ipns-success', (x, y) => {
          vorpal.log(`Successfully queried blockchain IPNS`)
        })

        dcl.on('ipfs:pin-success', () => {
          vorpal.log(`Successfully pinned files`)
        })

        dcl.on('ipfs:publish-request', () => {
          vorpal.log(`Publishing to IPFS, this may take a while...`)
        })

        dcl.on('ipfs:publish-success', (ipnsHash: string) => {
          vorpal.log(`IPNS hash: ${ipnsHash}`)
          vorpal.log(`Successfully published to IPFS`)
        })

        dcl.on('link:ready', async url => {
          await sceneLink()
          vorpal.log('Linking app ready.')
          vorpal.log(`Please proceed to ${url}`)
          opn(url)
        })

        dcl.on('link:success', async () => {
          await sceneLinkSuccess()
          vorpal.log('Project successfully linked to the blockchain')
        })

        await sceneUpload()
        vorpal.log(notice(`Uploading project to IPFS:`))
        await dcl.deploy()
        await sceneUploadSuccess()
        vorpal.log(success(`Successfully uploaded project to IPFS`))
        callback()
      })
    )
}
