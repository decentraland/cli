import { wrapCommand } from '../utils/wrapCommand'
import { loading, info, positive } from '../utils/logging'
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
      wrapCommand(async function(args: IDeployArguments) {
        const dcl = new Decentraland({
          ipfsHost: args.options.host || 'localhost',
          ipfsPort: args.options.port || 5001
        })

        dcl.on('ipfs:add', () => {
          const spinner = loading('Uploading files to local IPFS node')
          dcl.on('ipfs:add-success', () => {
            spinner.succeed()
          })
        })

        dcl.on('ethereum:get-ipns', ({ x, y }) => {
          const spinner = loading(`Checking IPNS for coordinates ${x},${y}`)

          dcl.on('ethereum:get-ipns-empty', () => {
            spinner.info(`No IPNS found for coordinates ${x},${y}`)
          })

          dcl.on('ethereum:get-ipns-success', () => {
            spinner.succeed()
          })
        })

        dcl.on('ipfs:publish', (ipfsHash: string) => {
          const spinner = loading(`Publishing IPNS for ${ipfsHash}`)

          dcl.on('ipfs:publish-success', (ipnsHash: string) => {
            spinner.succeed()
            info(`IPNS hash: ${ipnsHash}`)
          })
        })

        dcl.on('link:ready', async url => {
          await Analytics.sceneLink()
          const linkerMsg = loading(`Linking app ready at ${url}`)
          opn(url)

          dcl.on('link:success', async () => {
            await Analytics.sceneLinkSuccess()
            linkerMsg.succeed('Project successfully updated in LAND Registry')
          })
        })

        dcl.on('ipfs:pin', async () => {
          await Analytics.pinRequest()
          const spinner = loading(`Pinning files to IPFS gateway`)

          dcl.on('ipfs:pin-success', async () => {
            await Analytics.pinSuccess()
            spinner.succeed()
          })
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
            process.exit(1)
          }
        }

        await dcl.deploy(files)
        await Analytics.sceneDeploySuccess()
        vorpal.log(positive(`\nDeployment complete!`))
      })
    )
}
