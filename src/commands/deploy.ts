import { wrapAsync } from '../utils/wrap-async'
import { IPFS } from '../lib/IPFS'
import { Project } from '../lib/Project'
import { getRootPath } from '../utils/project'
import { success } from '../utils/logging'
import { sceneUpload, sceneUploadSuccess } from '../utils/analytics'

export function deploy(vorpal: any) {
  vorpal
    .command('deploy')
    .alias('upload')
    .description('Uploads scene to IPFS and updates IPNS.')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        let progCount = 0
        let accumProgress = 0
        const localIPFS = new IPFS()
        const project = new Project()
        await project.validateExistingProject()

        localIPFS.on('add_progress', p => {
          progCount += 1
          accumProgress += p
          vorpal.log(`Uploading ${progCount}/${progCount} files to IPFS (${accumProgress} bytes uploaded)`)
        })

        localIPFS.on('add_complete', () => {
          vorpal.log(success('Files successfully added to your IPFS node'))
        })

        localIPFS.on('pin', () => {
          vorpal.log(`Pinning files...`)
        })

        localIPFS.on('publish', () => {
          vorpal.log(`Publishing to IPFS...`)
        })

        localIPFS.on('done', async () => {
          await sceneUploadSuccess()
        })

        const coords = await project.getParcelCoordinates()
        const files = await project.getFiles()
        const projectFile = await project.getProjectFile()
        let ipfsKey = projectFile.ipfsKey

        await sceneUpload()
        await localIPFS.upload(coords, files, projectFile.id, !!ipfsKey)

        if (!ipfsKey) {
          ipfsKey = await localIPFS.genIPFSKey(projectFile.id)
          await project.writeProjectFile(getRootPath(), {
            ipfsKey
          })
          vorpal.log(success('IPFS key generated successfully'))
        }

        callback()
      })
    )
}
