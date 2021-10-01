import * as arg from 'arg'
import chalk from 'chalk'
import { CatalystClient, ContentAPI, ContentClient, DeploymentBuilder } from 'dcl-catalyst-client'
import { EntityType } from 'dcl-catalyst-commons'
import { Authenticator } from 'dcl-crypto'
import { ChainId, getChainName } from '@dcl/schemas'

import opn = require('opn')

import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { IFile } from '../lib/Project'
import { LinkerResponse } from 'src/lib/LinkerAPI'
import * as spinner from '../utils/spinner'
import { debug } from '../utils/logging'
import { buildTypescript, checkECSVersions } from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -t, --target              Specifies the address and port for the target catalyst server. Defaults to peer.decentraland.org
      -t, --target-content      Specifies the address and port for the target content server. Example: 'peer.decentraland.org/content'. Can't be set together with --target
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build before deploy

    ${chalk.dim('Example:')}

    - Deploy your scene:

      ${chalk.green('$ dcl deploy')}

    - Deploy your scene to a specific content server:

    ${chalk.green('$ dcl deploy --target my-favorite-catalyst-server.org:2323')}
`

export async function main(): Promise<number> {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--target': String,
    '-t': '--target',
    '--target-content': String,
    '-tc': '--target-content',
    '--skip-version-checks': Boolean,
    '--skip-build': Boolean
  })

  Analytics.deploy()

  if (args['--target'] && args['--target-content']) {
    throw new Error(`You can't set both the 'target' and 'target-content' arguments.`)
  }

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const skipBuild = args['--skip-build']

  if (!skipVersionCheck) {
    await checkECSVersions(workDir)
  }

  if (await isTypescriptProject(workDir)) {
    spinner.create('Building scene in production mode')
    if (!skipBuild) {
      try {
        await buildTypescript({
          workingDir: workDir,
          watch: false,
          production: true
        })
        spinner.succeed('Scene built successfully')
      } catch (error) {
        spinner.fail(`Build scene in production mode failed. ${error}`)
      }
    } else {
      spinner.succeed()
    }

    spinner.create('Creating deployment structure')

    const dcl = new Decentraland({
      isHttps: args['--https'],
      workingDir: workDir,
      forceDeploy: args['--force-upload'],
      yes: args['--yes']
    })

    // Obtain list of files to deploy
    let originalFilesToIgnore = await dcl.project.getDCLIgnore()
    if (originalFilesToIgnore === null) {
      originalFilesToIgnore = await dcl.project.writeDclIgnore()
    }
    let filesToIgnorePlusEntityJson = originalFilesToIgnore
    if (!filesToIgnorePlusEntityJson.includes('entity.json')) {
      filesToIgnorePlusEntityJson = filesToIgnorePlusEntityJson + '\n' + 'entity.json'
    }
    const files: IFile[] = await dcl.project.getFiles(filesToIgnorePlusEntityJson)
    const contentFiles = new Map(files.map(file => [file.path, file.content]))

    // Create scene.json
    const sceneJson = await getSceneFile(workDir)

    const { entityId, files: entityFiles } = await DeploymentBuilder.buildEntity(
      EntityType.SCENE,
      findPointers(sceneJson),
      contentFiles,
      sceneJson
    )

    spinner.succeed('Deployment structure created.')

    dcl.on('link:ready', url => {
      console.log(chalk.bold('You need to sign the content before the deployment:'))
      spinner.create(`Signing app ready at ${url}`)

      setTimeout(() => {
        try {
          opn(url)
        } catch (e) {
          console.log(`Unable to open browser automatically`)
        }
      }, 5000)

      dcl.on('link:success', ({ address, signature, chainId }: LinkerResponse) => {
        spinner.succeed(`Content successfully signed.`)
        console.log(`${chalk.bold('Address:')} ${address}`)
        console.log(`${chalk.bold('Signature:')} ${signature}`)
        console.log(`${chalk.bold('Network:')} ${getChainName(chainId)}`)
      })
    })

    // Signing message
    const messageToSign = entityId
    const { signature, address, chainId } = await dcl.getAddressAndSignature(messageToSign)
    const authChain = Authenticator.createSimpleAuthChain(entityId, address, signature)

    // Uploading data
    let catalyst: ContentAPI

    if (args['--target']) {
      let target = args['--target']
      if (target.endsWith('/')) {
        target = target.slice(0, -1)
      }
      catalyst = new CatalystClient(target, 'CLI')
    } else if (args['--target-content']) {
      const targetContent = args['--target-content']
      catalyst = new ContentClient(targetContent, 'CLI')
    } else {
      catalyst = await CatalystClient.connectedToCatalystIn('mainnet', 'CLI')
    }
    spinner.create(`Uploading data to: ${catalyst.getContentUrl()}`)

    const deployData = { entityId, files: entityFiles, authChain }
    const position = sceneJson.scene.base
    const network = (!chainId || chainId) === ChainId.ETHEREUM_MAINNET ? 'mainnet' : 'ropsten'
    const sceneUrl = `https://play.decentraland.org/?NETWORK=${network}&position=${position}`

    try {
      await catalyst.deployEntity(deployData, false, { timeout: '10m' })
      spinner.succeed(`Content uploaded. ${chalk.bold(sceneUrl)}`)
      Analytics.sceneDeploySuccess()
    } catch (error) {
      debug('\n' + error.stack)
      spinner.fail(`Could not upload content. ${error}`)
    }
  } else {
    console.log(
      `Could not upload content. Please make sure that your project has a 'tsconfig.json' file.`
    )
    return 1
  }

  return 0
}

function findPointers(sceneJson: any): string[] {
  return sceneJson.scene.parcels
}
