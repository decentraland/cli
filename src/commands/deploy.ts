import * as arg from 'arg'
import chalk from 'chalk'
import { ContentClient, DeploymentBuilder } from 'dcl-catalyst-client'
import { EntityType } from 'dcl-catalyst-commons'
import { Authenticator } from 'dcl-crypto'

import opn = require('opn')

import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { IFile } from '../lib/Project'
import { LinkerResponse } from 'src/lib/LinkerAPI'
import * as spinner from '../utils/spinner'
import { debug } from '../utils/logging'

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -t, --target              Specifies the address and port for the target catalyst server. Defaults to peer.decentraland.org
      -t, --target-content      Specifies the address and port for the target content server. Example: 'peer.decentraland.org/content'. Can't be set together with --target

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
    '-tc': '--target-content'
  })

  if (args['--target'] && args['--target-content']) {
    throw new Error(`You can't set both the 'target' and 'target-content' arguments.`)
  }

  const workDir = process.cwd()

  if (await isTypescriptProject(workDir)) {
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
    console.log()
    console.log(`Discovered ${chalk.bold(`${files.length}`)} files.`)

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

      dcl.on('link:success', ({ address, signature, network }: LinkerResponse) => {
        spinner.succeed(`Content successfully signed.`)
        console.log(`${chalk.bold('Address:')} ${address}`)
        console.log(`${chalk.bold('Signature:')} ${signature}`)
        console.log(
          `${chalk.bold('Network:')} ${
            network.label ? `${network.label} (${network.name})` : network.name
          }`
        )
      })
    })

    // Signing message
    const messageToSign = entityId
    const { signature, address } = await dcl.getAddressAndSignature(messageToSign)
    const authChain = Authenticator.createSimpleAuthChain(entityId, address, signature)

    // Uploading data
    let contentServerAddress: string

    if (args['--target']) {
      let target = args['--target']
      if (target.endsWith('/')) {
        target = target.slice(0, -1)
      }
      contentServerAddress = target + '/content'
    } else if (args['--target-content']) {
      contentServerAddress = args['--target-content']
    } else {
      contentServerAddress = 'peer.decentraland.org/content'
    }

    spinner.create(`Uploading data to: ${contentServerAddress}`)
    const deployData = { entityId, files: entityFiles, authChain }
    const catalyst = new ContentClient(contentServerAddress, 'CLI')

    try {
      await catalyst.deployEntity(deployData, false, { timeout: '10m' })
      spinner.succeed('Content uploaded.')
    } catch (error) {
      debug('\n' + error.stack)
      spinner.fail(`Could not upload content. ${error}`)
    }
  }

  return 0
}

function findPointers(sceneJson: any): string[] {
  return sceneJson.scene.parcels
}
