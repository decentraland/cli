import * as path from 'path'
import * as inquirer from 'inquirer'
import * as arg from 'arg'
import chalk from 'chalk'
import opn = require('opn')

import * as spinner from '../utils/spinner'
import { warning } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { ErrorType, fail } from '../utils/errors'
import { Decentraland } from '../lib/Decentraland'
import { LinkerResponse } from '../lib/LinkerAPI'

const MAX_FILE_COUNT = 100

export const help = () => `
  Usage: ${chalk.bold('dcl deploy [path] [options]')}

    ${chalk.dim('Options:')}

      -h, --help          Displays complete help
      -y, --yes           Skip confirmations and proceed to upload
      -l, --https         Use self-signed localhost certificate to use HTTPs at linking app (required for ledger users)
      -p, --partial       Deploy only new changed files
      -n, --network       Choose between ${chalk.bold('mainnet')} and ${chalk.bold(
  'ropsten'
)} (default 'mainnet') only available with env ${chalk.bold('DCL_PRIVATE_KEY')}

    ${chalk.dim('Examples:')}

    - Deploy a Decentraland Scene project in folder my-project

      ${chalk.green('$ dcl deploy my-project')}

    - Deploy a Decentraland Scene from a CI or an automated context

      ${chalk.green('$ dcl deploy -y')}

    - Deploy a Decentraland Scene project using a ledger hardware wallet

      ${chalk.green('$ dcl deploy --https')}
`

export async function main() {
  const argOps = {
    '--help': Boolean,
    '--yes': Boolean,
    '--https': Boolean,
    '--partial': Boolean,
    '-h': '--help',
    '-y': '--yes',
    '-l': '--https',
    '-p': '--partial'
  }
  const args = process.env.DCL_PRIVATE_KEY
    ? arg({ ...argOps, '--network': String, '-n': '--network' })
    : arg(argOps)

  const workingDir = args._[1] ? path.resolve(process.cwd(), args._[1]) : process.cwd()

  const dcl = new Decentraland({
    isHttps: args['--https'],
    workingDir,
    forceDeploy: !args['--partial'],
    yes: args['--yes']
  })

  let ignoreFile = await dcl.project.getDCLIgnore()

  dcl.on('link:ready', url => {
    Analytics.sceneLink()
    console.log(chalk.bold('You need to sign the content before the deployment:'))
    spinner.create(`Signing app ready at ${url}`)

    setTimeout(() => {
      try {
        opn(url)
      } catch (e) {
        console.log(warning(`Unable to open browser automatically`))
      }
    }, 5000)

    dcl.on('link:success', ({ address, signature, network }: LinkerResponse) => {
      Analytics.sceneLinkSuccess()
      spinner.succeed(`Content succesfully signed.`)
      console.log(`${chalk.bold('Address:')} ${address}`)
      console.log(`${chalk.bold('Signature:')} ${signature}`)
      console.log(
        `${chalk.bold('Network:')} ${
          network.label ? `${network.label} (${network.name})` : network.name
        }`
      )
    })
  })

  dcl.on('upload:starting', () => {
    spinner.create(`Uploading content...`)

    dcl.on('upload:failed', (error: any) => {
      spinner.fail('Failed to upload content')
      fail(ErrorType.DEPLOY_ERROR, `Unable ro upload content. ${error}`)
    })

    dcl.on('upload:success', () => {
      spinner.succeed('Content uploaded')
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
    console.log(
      warning(`As of version 1.1.0 all deployments require a ${chalk.bold('.dclignore')} file`)
    )
    console.log(`Generating ${chalk.bold('.dclignore')} file with default values`)
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

  if (!args['--yes']) {
    const results = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      default: true,
      message: `You are about to upload ${
        files.length
      } files (${totalSize} bytes). Do you want to continue?`
    })

    if (!results.continue) {
      console.log('Aborting...')
      return
    }
  }

  await dcl.deploy(files)
  Analytics.sceneDeploySuccess()
  return console.log(chalk.green(`\nDeployment complete!`))
}
