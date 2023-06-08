import arg from 'arg'
import chalk from 'chalk'
import {
  CatalystClient,
  ContentAPI,
  ContentClient,
  DeploymentBuilder
} from 'dcl-catalyst-client'
import { Authenticator } from '@dcl/crypto'
import { ChainId, EntityType, getChainName, Scene } from '@dcl/schemas'
import opn from 'opn'

import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { IFile } from '../lib/Project'
import { LinkerResponse } from '../lib/LinkerAPI'
import * as spinner from '../utils/spinner'
import { debug } from '../utils/logging'
import { buildTypescript } from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { validateScene } from '../sceneJson/utils'
import { ErrorType, fail } from '../utils/errors'

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -t, --target              Specifies the address and port for the target catalyst server. Defaults to peer.decentraland.org
      -t, --target-content      Specifies the address and port for the target content server. Example: 'peer.decentraland.org/content'. Can't be set together with --target
      -b, --no-browser          Do not open a new browser window
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build before deploy
      --skip-validations        Skip permissions verifications on the client side when deploying content
      --skip-file-size-check    Skip check for maximum file size when deploying to a target content server. Must be used with --target-content

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
    '--skip-validations': Boolean,
    '--skip-version-checks': Boolean,
    '--skip-build': Boolean,
    '--skip-file-size-check': Boolean,
    '--https': Boolean,
    '--force-upload': Boolean,
    '--yes': Boolean,
    '--no-browser': Boolean,
    '-b': '--no-browser',
    '--port': String,
    '-p': '--port'
  })

  Analytics.sceneStartDeploy()

  if (args['--target'] && args['--target-content']) {
    throw new Error(
      `You can't set both the 'target' and 'target-content' arguments.`
    )
  }

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const skipBuild = args['--skip-build']
  const skipFileSizeCheck =
    !!args['--skip-file-size-check'] && !!args['--target-content']
  const noBrowser = args['--no-browser']
  const port = args['--port']
  const parsedPort = typeof port === 'string' ? parseInt(port, 10) : void 0
  const linkerPort =
    parsedPort && Number.isInteger(parsedPort) ? parsedPort : void 0

  spinner.create('Creating deployment structure')

  const dcl = new Decentraland({
    isHttps: !!args['--https'],
    workingDir: workDir,
    forceDeploy: args['--force-upload'],
    yes: args['--yes'],
    // validations are skipped for custom content servers
    skipValidations:
      !!args['--skip-validations'] ||
      !!args['--target'] ||
      !!args['--target-content'],
    linkerPort
  })

  const project = dcl.workspace.getSingleProject()
  if (!project) {
    return failWithSpinner(
      'Cannot deploy a workspace, please go to the project directory and run `dcl deploy` again there.'
    )
  }

  if (!skipVersionCheck) {
    await project.checkCLIandECSCompatibility()
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

  // Obtain list of files to deploy
  const originalFilesToIgnore =
    (await project.getDCLIgnore()) ?? (await project.writeDclIgnore())
  const filesToIgnorePlusEntityJson =
    originalFilesToIgnore.concat('\n entity.json')

  const files: IFile[] = await project.getFiles({
    ignoreFiles: filesToIgnorePlusEntityJson,
    skipFileSizeCheck: skipFileSizeCheck
  })
  const contentFiles = new Map(files.map((file) => [file.path, file.content]))

  // Create scene.json
  const sceneJson: Scene & { dreamSpaceConfiguration?: any } =
    await getSceneFile(workDir)

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

    if (!noBrowser) {
      setTimeout(async () => {
        try {
          await opn(`${url}?${params}`)
        } catch (e) {
          console.log(`Unable to open browser automatically`)
        }
      }, 5000)
    }

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
  } else {
    catalyst = await CatalystClient.connectedToCatalystIn({
      network: 'mainnet'
    })
  }
  spinner.create(`Uploading data to: ${catalyst.getContentUrl()}`)

  const deployData = { entityId, files: entityFiles, authChain }
  const position = sceneJson.scene.base
  const network = chainId === ChainId.ETHEREUM_GOERLI ? 'goerli' : 'mainnet'
  const sceneUrl = `https://play.decentraland.org/?NETWORK=${network}&position=${position}`

  try {
    const response = (await catalyst.deploy(deployData, {
      timeout: '10m'
    })) as { message?: string }
    project.setDeployInfo({ status: 'success' })
    spinner.succeed(`Content uploaded. ${chalk.underline.bold(sceneUrl)}\n`)

    const baseCoords = await dcl.workspace.getBaseCoords()
    const parcelCount = await dcl.workspace.getParcelCount()
    Analytics.sceneDeploySuccess({
      projectHash: dcl.getProjectHash(),
      ecs: await dcl.workspace.getSingleProject()!.getEcsPackageVersion(),
      parcelCount: parcelCount,
      coords: baseCoords,
      isWorld:
        !!sceneJson.worldConfiguration || !!sceneJson.dreamSpaceConfiguration,
      sceneId: entityId,
      targetContentServer: catalyst.getContentUrl(),
      worldName:
        sceneJson.worldConfiguration?.name ||
        sceneJson.dreamSpaceConfiguration?.name
    })

    if (response.message) {
      console.log(response.message)
    }
  } catch (error: any) {
    debug('\n' + error.stack)
    failWithSpinner('Could not upload content', error)
  }
}

function findPointers(sceneJson: any): string[] {
  return sceneJson.scene.parcels
}
