import * as path from 'path'
import * as fs from 'fs-extra'
import * as inquirer from 'inquirer'
import * as arg from 'arg'
import chalk from 'chalk'
import opn = require('opn')

import * as spinner from '../utils/spinner'
import buildProject from '../utils/buildProject'
import isECSProject from '../utils/isECSProject'
import { warning } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { ErrorType, fail } from '../utils/errors'
import { Decentraland } from '../lib/Decentraland'
import { LinkerResponse } from '../lib/LinkerAPI'
import { getSceneFile } from 'src/sceneJson'
import { lintSceneFile } from 'src/sceneJson/lintSceneFile'

export const help = () => `
  Usage: ${chalk.bold('dcl deploy [path] [options]')}

    ${chalk.dim('Options:')}

      -h, --help          Displays complete help
      -y, --yes           Skip confirmations and proceed to upload
      -l, --https         Use self-signed localhost certificate to use HTTPs at linking app (required for ledger users)
      -f, --force-upload  Upload all files to the content server
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
    '--force-upload': Boolean,
    '-h': '--help',
    '-y': '--yes',
    '-l': '--https',
    '-f': '--force-upload'
  }
  const args = process.env.DCL_PRIVATE_KEY
    ? arg({ ...argOps, '--network': String, '-n': '--network' })
    : arg(argOps)

  const workingDir = args._[1] ? path.resolve(process.cwd(), args._[1]) : process.cwd()

  spinner.create('Checking existance of build')

  await lintSceneFile(workingDir)
  const sceneJson = await getSceneFile()
  const mainPath = path.resolve(workingDir, sceneJson.main)

  if (!(await fs.pathExists(mainPath))) {
    const errorMsg = `Could not find the build. Make sure that the ${chalk.bold(
      'main'
    )} file of the ${chalk.bold('scene.json')} exists`
    const pkgPath = path.resolve(workingDir, 'package.json')
    if (!(await fs.pathExists(pkgPath))) {
      throw new Error(errorMsg)
    }

    const pkg = await fs.readJSON(pkgPath)
    if (isECSProject(pkg)) {
      spinner.succeed(`${warning('No build found, triggering ')}${chalk.bold(`"npm run build"`)}`)
      spinner.create('Building project')
      try {
        await buildProject(workingDir)
      } catch (error) {
        spinner.fail('Could not build the project')
        throw new Error(error)
      }
      spinner.succeed('Project built')
    } else {
      throw new Error(errorMsg)
    }
  } else {
    spinner.succeed('Build found')
  }

  const dcl = new Decentraland({
    isHttps: args['--https'],
    workingDir,
    forceDeploy: args['--force-upload'],
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

  const address = await dcl.deploy(files)
  Analytics.sceneDeploySuccess({ address })
  return console.log(chalk.green(`\nDeployment complete!`))
}
