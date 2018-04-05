import { wrapAsync } from '../utils/wrap-async'
import { IPFS } from '../lib/IPFS'
import { Project } from '../lib/Project'
import { getRootPath } from '../utils/project'
import { success, notice } from '../utils/logging'
import { sceneUpload, sceneUploadSuccess } from '../utils/analytics'
import { Ethereum } from '../lib/Ethereum'
import { pin } from './pin'
import { link } from './link'

export function deploy(vorpal: any) {
  vorpal
    .command('deploy')
    .alias('upload')
    .description('Uploads scene to IPFS and updates IPNS.')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        const localIPFS = new IPFS()
        const project = new Project()
        const ethereum = new Ethereum()

        await project.validateExistingProject()
        await Ethereum.connect()

        localIPFS.on('add_progress', (bytes, files, total) => {
          vorpal.log(`Uploading ${files}/${total} files to IPFS (${bytes} bytes uploaded)`)
        })

        localIPFS.on('add_complete', () => {
          vorpal.log('Successfully added files to local IPFS node')
        })

        localIPFS.on('ipns', (x, y) => {
          vorpal.log(`Checking IPNS for coordinates ${x}, ${y}`)
        })

        localIPFS.on('ipns_complete', (x, y) => {
          vorpal.log(`Successfully queried blockchain IPNS`)
        })

        localIPFS.on('pin_complete', () => {
          vorpal.log(`Successfully pinned files`)
        })

        localIPFS.on('publish', () => {
          vorpal.log(`Publishing to IPFS, this may take a while...`)
        })

        localIPFS.on('publish_complete', (ipnsHash: string) => {
          vorpal.log(`IPNS hash: ${ipnsHash}`)
          vorpal.log(`Successfully published to IPFS`)
        })

        await sceneUpload()
        vorpal.log(notice(`Uploading project to IPFS:`))

        const files = await project.getFiles()
        const coords = await project.getParcelCoordinates()
        const projectFile = await project.getProjectFile()
        const filesAdded = await localIPFS.addFiles(files)
        const rootFolder = filesAdded[filesAdded.length - 1]
        const ipns = await ethereum.getIPNS(coords)
        let ipfsKey = projectFile.ipfsKey

        if (!ipfsKey) {
          ipfsKey = await localIPFS.genIPFSKey(projectFile.id)
          await project.writeProjectFile(getRootPath(), {
            ipfsKey
          })
          vorpal.log('IPFS key generated successfully')
        }

        await localIPFS.publish(projectFile.id, `/ipfs/${rootFolder.hash}`)

        if (ethereum.isValidIPNS(ipns) && ipfsKey !== ipns) {
          await link(vorpal, project)
        }

        await pin(vorpal, project, localIPFS)

        await sceneUploadSuccess()
        vorpal.log(success(`Successfully uploaded project to IPFS`))

        callback()
      })
    )
}
