import arg from 'arg'
import chalk from 'chalk'
import {
  CatalystClient,
  ContentAPI,
  ContentClient,
  DeploymentBuilder
} from 'dcl-catalyst-client'
import { EntityType } from 'dcl-catalyst-commons'
import { Authenticator } from 'dcl-crypto'
import { ChainId, getChainName, sdk } from '@dcl/schemas'
import opn from 'opn'
import * as path from 'path'

import { isTypescriptProject } from '../project/isTypescriptProject'
import { getSceneFile } from '../sceneJson'
import { Decentraland } from '../lib/Decentraland'
import { IFile } from '../lib/Project'
import { LinkerResponse } from '../lib/LinkerAPI'
import * as spinner from '../utils/spinner'
import { debug } from '../utils/logging'
import { buildTypescript, checkECSVersions } from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { validateScene } from '../sceneJson/utils'
import { ErrorType, fail } from '../utils/errors'
import { BodyShapeType, BuilderClient, ItemFactory } from '@dcl/builder-client'
import { ethers } from 'ethers'
import { readFile, readJSON } from 'fs-extra'

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
    '--skip-version-checks': Boolean,
    '--skip-build': Boolean,
    '--https': Boolean,
    '--force-upload': Boolean,
    '--yes': Boolean
  })

  Analytics.deploy()

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const skipBuild = args['--skip-build']
  const target = args['--target']
  const targetContent = args['--target-content']

  if (target && targetContent) {
    throw new Error(
      `You can't set both the 'target' and 'target-content' arguments.`
    )
  }

  if (!skipVersionCheck) {
    await checkECSVersions(workDir)
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
    yes: args['--yes']
  })

  const project = dcl.workspace.getSingleProject()
  if (!project) {
    return failWithSpinner(
      'Cannot deploy a workspace, please go to the project directory and run `dcl deploy` again there.'
    )
  } else if (project.getInfo().sceneType === sdk.ProjectType.SMART_ITEM) {
    return failWithSpinner('Cannot deploy a smart item.')
  }

  if (project.getInfo().sceneType === sdk.ProjectType.SCENE) {
    await deployScene({ dcl, target, targetContent })
  } else if (
    project.getInfo().sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE
  ) {
    spinner.create('Building smart wearable')
    await deploySmartWearable({ dcl })
  }
}

async function deployScene({
  dcl,
  target,
  targetContent
}: {
  dcl: Decentraland
  target?: string
  targetContent?: string
}) {
  const project = dcl.workspace.getSingleProject()!

  // Obtain list of files to deploy
  let originalFilesToIgnore = await project.getDCLIgnore()
  if (originalFilesToIgnore === null) {
    originalFilesToIgnore = await project.writeDclIgnore()
  }
  let filesToIgnorePlusEntityJson = originalFilesToIgnore
  if (!filesToIgnorePlusEntityJson.includes('entity.json')) {
    filesToIgnorePlusEntityJson =
      filesToIgnorePlusEntityJson + '\n' + 'entity.json'
  }
  const files: IFile[] = await project.getFiles(filesToIgnorePlusEntityJson)
  const contentFiles = new Map(files.map((file) => [file.path, file.content]))

  // Create scene.json
  const sceneJson = await getSceneFile(project.getProjectWorkingDir())

  const { entityId, files: entityFiles } = await DeploymentBuilder.buildEntity({
    type: EntityType.SCENE,
    pointers: findPointers(sceneJson),
    files: contentFiles,
    metadata: sceneJson
  })

  spinner.succeed('Deployment structure created.')

  //  Validate scene.json
  validateScene(sceneJson, true)

  dcl.on('link:ready', (url) => {
    console.log(
      chalk.bold('You need to sign the content before the deployment:')
    )
    spinner.create(`Signing app ready at ${url}`)

    setTimeout(() => {
      try {
        // tslint:disable-next-line: no-floating-promises
        void opn(url)
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

  if (target) {
    catalyst = new CatalystClient({ catalystUrl: cropLastSlash(target) })
  } else if (targetContent) {
    catalyst = new ContentClient({ contentUrl: targetContent })
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
    await catalyst.deployEntity(deployData, false, { timeout: '10m' })
    spinner.succeed(`Content uploaded. ${chalk.underline.bold(sceneUrl)}`)
    Analytics.sceneDeploySuccess()
  } catch (error: any) {
    debug('\n' + error.stack)
    failWithSpinner('Could not upload content', error)
  }
}

function findPointers(sceneJson: any): string[] {
  return sceneJson.scene.parcels
}

function cropLastSlash(str: string) {
  return str.replace(/\/?$/, '')
}

async function deploySmartWearable({ dcl }: { dcl: Decentraland }) {
  const project = dcl.workspace.getSingleProject()!
  const assetJsonPath = path.resolve(
    project.getProjectWorkingDir(),
    'asset.json'
  )
  const assetJson = await readJSON(assetJsonPath)

  if (!sdk.AssetJson.validate(assetJson)) {
    const errors = (sdk.AssetJson.validate.errors || [])
      .map((a) => `${a.dataPath} ${a.message}`)
      .join('')

    console.error(
      `Unable to validate asset.json properly, please check it.`,
      errors
    )
    throw new Error(`Invalid asset.json (${assetJsonPath})`)
  }

  const assetBasicConfig = assetJson as sdk.AssetJson
  const thumbnailContent = await readFile(
    path.resolve(project.getProjectWorkingDir(), assetBasicConfig.thumbnail)
  )

  let originalFilesToIgnore = await project.getDCLIgnore()
  if (originalFilesToIgnore === null) {
    originalFilesToIgnore = await project.writeDclIgnore()
  }

  const content: any = {}
  const files: IFile[] = await project.getFiles(originalFilesToIgnore)
  for (const file of files) {
    content[file.path] = file.content
  }
  content['thumbnail.png'] = content[assetBasicConfig.thumbnail]
  delete content['asset.json']

  const item = new ItemFactory<Buffer>()
    .newItem({
      id: assetBasicConfig.id,
      name: assetBasicConfig.name,
      description: assetBasicConfig.description,
      rarity: assetBasicConfig.rarity
    })
    .withCategory(assetBasicConfig.category)
    .withThumbnail(thumbnailContent)
    .withRepresentation(
      assetBasicConfig.bodyShape as any as BodyShapeType,
      assetBasicConfig.model,
      content,
      {
        triangles: 0,
        materials: 0,
        meshes: 0,
        bodies: 0,
        entities: 0,
        textures: 0
      }
    )

  const builtItem = await item.build()

  // const aPrivateKey = 'insertHereAPrivateKey'
  // const wallet = new ethers.Wallet(aPrivateKey)
  // const identity = await createIdentity(wallet as any, 1000)
  // const address = await wallet.getAddress()

  // const messageToSign = entityId
  // const { signature, address, chainId } = await dcl.getAddressAndSignature(
  //   messageToSign
  // )
  // const authChain = Authenticator.createSimpleAuthChain(
  //   entityId,
  //   address,
  //   signature
  // )

  spinner.succeed('Smart wearable built!')

  spinner.create('Waiting for sign pre deployment')

  dcl.on('link:ready', (url) => {
    console.log(
      chalk.bold('You need to sign the content before the deployment:')
    )
    spinner.create(`Signing app ready at ${url}`)

    setTimeout(() => {
      try {
        // tslint:disable-next-line: no-floating-promises
        void opn(url)
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

  const { identity, address } = await createLinkerIdentity(dcl)

  const client = new BuilderClient(
    'https://builder-api.decentraland.io',
    identity,
    address
  )
  await client.upsertItem(builtItem.item, builtItem.newContent)

  spinner.succeed('Wearable uploaded succesfully!')
}

async function createLinkerIdentity(dcl: Decentraland) {
  const wallet = ethers.Wallet.createRandom()
  const payload = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: await wallet.getAddress()
  }

  const { address } = await dcl.getAddressAndSignature('test')

  const identity = await Authenticator.initializeAuthChain(
    address,
    payload,
    1000,
    async (message) => {
      const linkerResponse = await dcl.getAddressAndSignature(message)
      return linkerResponse.signature
    }
  )

  return { identity, address }
}
