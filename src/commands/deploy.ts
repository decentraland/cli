import arg from 'arg'
import chalk from 'chalk'
import {
  CatalystClient,
  ContentAPI,
  ContentClient,
  DeploymentBuilder
} from 'dcl-catalyst-client'
import { Authenticator } from '@dcl/crypto'
import { ChainId, getChainName, EntityType } from '@dcl/schemas'
import opn from 'opn'

import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { IFile } from '../lib/Project'
import { LinkerResponse } from '../lib/LinkerAPI'
import * as spinner from '../utils/spinner'
import { debug } from '../utils/logging'
import { buildTypescript, checkECSAndCLIVersions } from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { validateScene } from '../sceneJson/utils'
import { ErrorType, fail } from '../utils/errors'

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -t, --target              Specifies the address and port for the target catalyst server. Defaults to peer.decentraland.org
      -t, --target-content      Specifies the address and port for the target content server. Example: 'peer.decentraland.org/content'. Can't be set together with --target
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build before deploy
      --authorization-server    Specifies the address of the server verifying permissions

    ${chalk.dim('Example:')}

    - Deploy your scene:

      ${chalk.green('$ dcl deploy')}

    - Deploy your scene to a specific content server:

    ${chalk.green('$ dcl deploy --target my-favorite-catalyst-server.org:2323')}
`

export function failWithSpinner(message: string, error?: any): void {
  spinner.fail(message)
  fail(ErrorType.DEPLOY_ERROR, error)
}

export async function main(): Promise<void> {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--target': String,
    '-t': '--target',
    '--target-content': String,
    '-tc': '--target-content',
    '--authorization-server': String,
    '-as': '--authorization-server',
    '--skip-version-checks': Boolean,
    '--skip-build': Boolean,
    '--https': Boolean,
    '--force-upload': Boolean,
    '--yes': Boolean
  })

  Analytics.deploy()

  if (args['--target'] && args['--target-content']) {
    throw new Error(
      `You can't set both the 'target' and 'target-content' arguments.`
    )
  }

  if (args['--target'] && args['--authorization-server']) {
    throw new Error(
      `You can't set both the 'target' and 'authorization-server' arguments.`
    )
  }

  if (args['--target-content'] && args['--authorization-server']) {
    throw new Error(
      `You can't set both the 'target-content' and 'authorization-server' arguments.`
    )
  }

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const skipBuild = args['--skip-build']

  if (!skipVersionCheck) {
    await checkECSAndCLIVersions(workDir)
  }

  spinner.create('Building scene in production mode')

  if (!(await isTypescriptProject(workDir))) {
    failWithSpinner(
      `Please make sure that your project has a 'tsconfig.json' file.`
    )
  }

  if (!skipBuild) {
    try {
      await buildTypescript({
        workingDir: workDir,
        watch: false,
        production: true,
        silence: true
      })
      spinner.succeed('Scene built successfully')
    } catch (error) {
      const message = 'Build /scene in production mode failed'
      failWithSpinner(message, error)
    }
  } else {
    spinner.succeed()
  }

  spinner.create('Creating deployment structure')

  const dcl = new Decentraland({
    isHttps: !!args['--https'],
    workingDir: workDir,
    forceDeploy: args['--force-upload'],
    yes: args['--yes'],
    authorizationServer: args['--authorization-server']
  })

  const project = dcl.workspace.getSingleProject()
  if (!project) {
    return failWithSpinner(
      'Cannot deploy a workspace, please go to the project directory and run `dcl deploy` again there.'
    )
  }

  // Obtain list of files to deploy
  const originalFilesToIgnore =
    (await project.getDCLIgnore()) ?? (await project.writeDclIgnore())
  const filesToIgnorePlusEntityJson =
    originalFilesToIgnore.concat('\n entity.json')

  const files: IFile[] = await project.getFiles({
    ignoreFiles: filesToIgnorePlusEntityJson
  })
  const contentFiles = new Map(files.map((file) => [file.path, file.content]))

  // Create scene.json
  const sceneJson = await getSceneFile(workDir)

  const { entityId, files: entityFiles } = await DeploymentBuilder.buildEntity({
    type: EntityType.SCENE,
    pointers: findPointers(sceneJson),
    files: contentFiles,
    metadata: sceneJson
  })

  spinner.succeed('Deployment structure created.')

  //  Validate scene.json
  validateScene(sceneJson, true)

  dcl.on('link:ready', ({ url, params }) => {
    console.log(
      chalk.bold('You need to sign the content before the deployment:')
    )
    spinner.create(`Signing app ready at ${url}`)

    setTimeout(async () => {
      try {
        await opn(`${url}?${params}`)
      } catch (e) {
        console.log(`Unable to open browser automatically`)
      }
    }, 5000)

    dcl.on(
      'link:success',
      ({ address, signature, chainId }: LinkerResponse) => {
        spinner.succeed(`Content successfully signed.`)
        console.log(`${chalk.bold('Address:')} ${address}`)
        console.log(`${chalk.bold('Signature:')} ${signature}`)
        console.log(`${chalk.bold('Network:')} ${getChainName(chainId!)}`)
      }
    )
  })

  // Signing message
  const messageToSign = entityId
  const { signature, address, chainId } = await dcl.getAddressAndSignature(
    messageToSign
  )
  const authChain = Authenticator.createSimpleAuthChain(
    entityId,
    address,
    signature
  )

  // Uploading data
  let catalyst: ContentAPI

  if (args['--target']) {
    let target = args['--target']
    if (target.endsWith('/')) {
      target = target.slice(0, -1)
    }
    catalyst = new CatalystClient({ catalystUrl: target })
  } else if (args['--target-content']) {
    const targetContent = args['--target-content']
    catalyst = new ContentClient({ contentUrl: targetContent })
  } else if (args['--authorization-server']) {
    let target = args['--authorization-server']
    if (target.endsWith('/')) {
      target = target.slice(0, -1)
    }
    catalyst = new CatalystClient({ catalystUrl: target })
  } else {
    catalyst = await CatalystClient.connectedToCatalystIn({
      network: 'mainnet'
    })
  }
  spinner.create(`Uploading data to: ${catalyst.getContentUrl()}`)

  const deployData = { entityId, files: entityFiles, authChain }
  const position = sceneJson.scene.base
  const network = chainId === ChainId.ETHEREUM_ROPSTEN ? 'ropsten' : 'mainnet'
  const sceneUrl = `https://play.decentraland.org/?NETWORK=${network}&position=${position}`

  try {
    const response = (await catalyst.deploy(deployData, {
      timeout: '10m'
    })) as { message?: string }
    project.setDeployInfo({ status: 'success' })
    spinner.succeed(`Content uploaded. ${chalk.underline.bold(sceneUrl)}\n`)
    Analytics.sceneDeploySuccess()

    if (response.message) {
      console.log(response.message)
    }
  } catch (error: any) {
    debug('\n' + error.stack)
    failWithSpinner('Could not upload content', error)
  }
  return
}

function findPointers(sceneJson: any): string[] {
  return sceneJson.scene.parcels
}
