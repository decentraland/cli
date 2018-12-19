import * as inquirer from 'inquirer'
import * as arg from 'arg'
import chalk from 'chalk'
import opn = require('opn')

import { loading, info, warning } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { ErrorType, fail } from '../utils/errors'
import { getRootPath } from '../utils/project'

const MAX_FILE_COUNT = 100

export const help = () => `
  Usage: ${chalk.bold('dcl deploy [path] [options]')}

    ${chalk.dim('Options:')}

      -h, --help          Displays complete help
      -c, --host  [host]  Set content server (default is https://content-service.decentraland.zone)
      -s, --skip          Skip confirmations and proceed to upload
      -l, --https         Use self-signed localhost certificate to use HTTPs at linking app (required for ledger users)

    ${chalk.dim('Examples:')}

    - Deploy a Decentraland Scene project in folder my-project

      ${chalk.green('$ dcl deploy my-project')}

    - Deploy a Decentraland Scene project using a ledger hardware wallet

      ${chalk.green('$ dcl deploy --https')}
`

export async function main() {
  const args = arg({
    '--help': Boolean,
    '--host': String,
    '--skip': Boolean,
    '--https': Boolean,
    '-h': '--help',
    '-c': '--host',
    '-s': '--skip',
    '-l': '--https'
  })

  const dcl = new Decentraland({
    isHttps: args['--https'],
    contentServerUrl: args['--host'] || 'https://content-service.decentraland.zone',
    workingDir: args._[2] || getRootPath()
  })

  let ignoreFile = await dcl.project.getDCLIgnore()

  dcl.on('link:ready', url => {
    Analytics.sceneLink()
    console.log(chalk.bold('You need to sign the content before the deployment:'))
    const linkerMsg = loading(`Signing app ready at ${url}`)

    setTimeout(() => {
      try {
        opn(url)
      } catch (e) {
        console.log(warning(`Unable to open browser automatically`))
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
    console.log(chalk.bold(`Using public address ${publicKey}`))
  }

  if (args['--https']) {
    console.log(warning(`Using self signed certificate to support ledger wallet`))
  }

  if (ignoreFile === null) {
    console.log(warning(`As of version 1.1.0 all deployments require a .dclignore file`))
    info(`Generating .dclignore file with default values`)
    ignoreFile = await dcl.project.writeDclIgnore()
  }

  Analytics.sceneDeploy()
  await dcl.project.validateExistingProject()
  const files = await dcl.project.getFiles(ignoreFile)

  console.log('\n  Tracked files:\n')

  const totalSize = files.reduce((size, file) => {
    console.log(`    ${file.path} (${file.size} bytes)`)
    return size + file.size
  }, 0)

  if (files.length > MAX_FILE_COUNT) {
    fail(ErrorType.DEPLOY_ERROR, `You cannot upload more than ${MAX_FILE_COUNT} files per scene.`)
  }

  console.log('') // new line to keep things clean

  if (!args['--skip']) {
    const results = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      default: true,
      message: `You are about to upload ${files.length} files (${totalSize} bytes). Do you want to continue?`
    })

    if (!results.continue) {
      console.log('Aborting...')
      process.exit(1)
    }
  }

  await dcl.deploy(files)
  Analytics.sceneDeploySuccess()
  console.log(chalk.green(`\nDeployment complete!`))
}
