import { wrapCommand } from '../utils/wrapCommand'
import { success, notice } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import opn = require('opn')
import inquirer = require('inquirer')

export interface IDeployArguments {
  options: {
    host?: string
    port?: number
    skip?: boolean
  }
}

export function deploy(vorpal: any) {
  vorpal
    .command('deploy')
    .alias('upload')
    .description('Uploads scene to IPFS and updates IPNS.')
    .option('-h, --host <string>', 'IPFS daemon API host (default is localhost).')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .option('-s, --skip', 'skip confirmations and proceed to upload')
    .action(
      wrapCommand(async function(args: IDeployArguments, callback: () => void) {
        await Analytics.requestPermission()

        const dcl = new Decentraland({
          ipfsHost: args.options.host || 'localhost',
          ipfsPort: args.options.port || 5001
        })

        dcl.on('ipfs:add-progress', (bytes, files, total) => {
          vorpal.log(`Uploading ${files}/${total} files to IPFS (${bytes} bytes uploaded)`)
        })

        dcl.on('ipfs:add-success', () => {
          vorpal.log('Successfully added files to local IPFS node')
        })

        dcl.on('ethereum:get-ipns-request', ({ x, y }) => {
          vorpal.log(`Checking IPNS for coordinates ${x}, ${y}`)
        })

        dcl.on('ethereum:get-ipns-success', () => {
          vorpal.log(`Successfully queried blockchain IPNS`)
        })

        dcl.on('ipfs:publish-request', () => {
          vorpal.log(`Publishing to IPFS, this may take a while...`)
        })

        dcl.on('ipfs:publish-success', (ipnsHash: string) => {
          vorpal.log(`IPNS hash: ${ipnsHash}`)
          vorpal.log(`Successfully published to IPFS`)
        })

        dcl.on('link:ready', async url => {
          await Analytics.sceneLink()
          vorpal.log('Linking app ready.')
          vorpal.log(`Please proceed to ${url}`)
          opn(url)
        })

        dcl.on('link:success', async () => {
          await Analytics.sceneLinkSuccess()
          vorpal.log('Project successfully linked to the blockchain')
        })

        dcl.on('ipfs:pin-request', async () => {
          await Analytics.pinRequest()
          vorpal.log(`Pinning to IPFS-GTW, this may take a while...`)
        })

        dcl.on('ipfs:pin-success', async () => {
          await Analytics.pinSuccess()
          vorpal.log(`Successfully pinned files`)
        })

        await Analytics.sceneDeploy()

        const files = await dcl.project.getFiles()

        vorpal.log('Tracked files:\n')

        const totalSize = files.reduce((size, file) => {
          vorpal.log(`\t${file.path} (${file.size} bytes)`)
          return size + file.size
        }, 0)

        vorpal.log('') // new line to keep things clean

        if (!args.options.skip) {
          const results = await inquirer.prompt({
            type: 'confirm',
            name: 'continue',
            default: true,
            message: `You are about to upload ${files.length} files (${totalSize} bytes). Do you want to continue?`
          })

          if (!results.continue) {
            vorpal.log('Aborting...')
            callback()
          }
        }

        vorpal.log(notice(`Uploading project to IPFS:\n`))
        await dcl.deploy(files)
        await Analytics.sceneDeploySuccess()
        vorpal.log(success(`Successfully uploaded project to IPFS`))
        callback()
      })
    )
}
