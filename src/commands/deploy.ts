import { wrapCommand } from '../utils/wrapCommand'
import { loading, info, positive, warning } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import opn = require('opn')
import inquirer = require('inquirer')
import { ErrorType, fail } from '../utils/errors'

const MAX_FILE_COUNT = 100

export interface IDeployArguments {
  options: {
    host?: string
    port?: number
    skip?: boolean
    https?: boolean
  }
}

export function deploy(vorpal: any) {
  vorpal
    .command('deploy')
    .description('Uploads scene to IPFS and updates IPNS.')
    .option('-h, --host <string>', 'IPFS daemon API host (default is localhost).')
    .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
    .option('-s, --skip', 'skip confirmations and proceed to upload')
    .option('-hs, --https', 'Use self-signed localhost certificate to use HTTPs at linking app (required for ledger users)')
    .action(
      wrapCommand(async (args: IDeployArguments) => {
        const dcl = new Decentraland({
          ipfsHost: args.options.host || 'localhost',
          ipfsPort: args.options.port || 5001,
          isHttps: !!args.options.https
        })

        let ignoreFile = await dcl.project.getDCLIgnore()

        dcl.on('ipfs:add', () => {
          const spinner = loading('Uploading files to local IPFS node')
          dcl.on('ipfs:add-success', () => {
            spinner.succeed()
          })
        })

        dcl.on('ethereum:get-ipns', (x, y) => {
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

        dcl.on('link:ready', url => {
          Analytics.sceneLink()
          info('This is the first time you deploy using this IPNS, please link your project to the LAND Registry:')
          const linkerMsg = loading(`Linking app ready at ${url}`)

          setTimeout(() => {
            try {
              opn(url)
            } catch (e) {
              vorpal.log(warning(`WARNING: Unable to open browser automatically`))
            }
          }, 5000)

          dcl.on('link:success', () => {
            Analytics.sceneLinkSuccess()
            linkerMsg.succeed('Project successfully updated in LAND Registry')
          })
        })

        dcl.on('ipfs:pin', () => {
          Analytics.pinRequest()
          const spinner = loading(`Pinning files to IPFS gateway`)

          dcl.on('ipfs:pin-success', async () => {
            Analytics.pinSuccess()
            spinner.succeed()
          })
        })

        if (args.options.https) {
          vorpal.log(warning(`WARNING: Using self signed certificate to support ledger wallet`))
        }

        if (ignoreFile === null) {
          vorpal.log(warning(`WARNING: As of version 1.1.0 all deployments require a .dclignore file`))
          info(`Generating .dclignore file with default values`)
          ignoreFile = await dcl.project.writeDclIgnore()
        }

        Analytics.sceneDeploy()
        await dcl.project.validateExistingProject()
        const files = await dcl.project.getFiles(ignoreFile)

        vorpal.log('\n  Tracked files:\n')

        const totalSize = files.reduce((size, file) => {
          vorpal.log(`    ${file.path} (${file.size} bytes)`)
          return size + file.size
        }, 0)

        if (files.length > MAX_FILE_COUNT) {
          fail(ErrorType.DEPLOY_ERROR, `You cannot upload more than ${MAX_FILE_COUNT} files per scene.`)
        }

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
        Analytics.sceneDeploySuccess()
        vorpal.log(positive(`\nDeployment complete!`))
      })
    )
}
