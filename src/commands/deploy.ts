import * as inquirer from 'inquirer'
import opn = require('opn')

import { wrapCommand } from '../utils/wrapCommand'
import { loading, info, positive, warning, bold } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { ErrorType, fail } from '../utils/errors'

const MAX_FILE_COUNT = 100

export interface IDeployArguments {
  options: {
    host?: string
    skip?: boolean
    https?: boolean
    forceDeploy?: boolean
  }
}

export function deploy(vorpal: any) {
  vorpal
    .command('deploy')
    .description('Uploads scene to content server.')
    .option('-h, --host <string>', 'Content servert url (default is https://content-service.decentraland.zone).')
    .option('-s, --skip', 'skip confirmations and proceed to upload')
    .option('-hs, --https', 'Use self-signed localhost certificate to use HTTPs at linking app (required for ledger users)')
    .option('-f, --force', 'deploy the full content')
    .action(
      wrapCommand(async (args: IDeployArguments) => {
        const dcl = new Decentraland({
          isHttps: !!args.options.https,
          contentServerUrl: args.options.host || 'https://content-service.decentraland.zone',
          forceDeploy: args.options.forceDeploy
        })

        let ignoreFile = await dcl.project.getDCLIgnore()

        dcl.on('link:ready', url => {
          Analytics.sceneLink()
          vorpal.log(bold('You need to sign the content before the deployment:'))
          const linkerMsg = loading(`Signing app ready at ${url}`)

          setTimeout(() => {
            try {
              opn(url)
            } catch (e) {
              vorpal.log(warning(`WARNING: Unable to open browser automatically`))
            }
          }, 5000)

          dcl.on('link:success', (signature: string) => {
            Analytics.sceneLinkSuccess()
            linkerMsg.succeed(`Content succesfully signed. Signature[${signature}]`)
          })
        })

        dcl.on('upload:starting', () => {
          const uploadMsg = loading(`Uploading content...`)

          dcl.on('upload:failed', (error: any) => {
            uploadMsg.fail('Fail to upload content')
            fail(ErrorType.DEPLOY_ERROR, `Unable ro upload content. ${error}`)
          })

          dcl.on('upload:success', () => {
            uploadMsg.succeed('Content uploaded')
          })
        })

        if (process.env.DCL_PRIVATE_KEY) {
          const publicKey = await dcl.getPublicAddress()
          vorpal.log(bold(`Using public address ${publicKey}`))
        }

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
