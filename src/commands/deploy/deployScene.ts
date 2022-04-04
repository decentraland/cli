import chalk from 'chalk'
import {
  CatalystClient,
  ContentAPI,
  ContentClient,
  DeploymentBuilder
} from 'dcl-catalyst-client'
import { EntityType } from 'dcl-catalyst-commons'
import { Authenticator } from 'dcl-crypto'
import { ChainId, getChainName } from '@dcl/schemas'
import opn from 'opn'

import { getSceneFile } from '../../sceneJson'
import { Decentraland } from '../../lib/Decentraland'
import { IFile } from '../../lib/Project'
import { LinkerResponse } from '@dcl/linker-dapp/types/modules/server/utils'
import * as spinner from '../../utils/spinner'
import { debug } from '../../utils/logging'
import { Analytics } from '../../utils/analytics'
import { validateScene } from '../../sceneJson/utils'
import { ErrorType, fail } from '../../utils/errors'

export default async function ({
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

    dcl.on('link:success', (response: LinkerResponse) => {
      if (response.responseType === 'scene-deploy') {
        spinner.succeed(`Content successfully signed.`)
        console.log(`${chalk.bold('Address:')} ${response.payload.address}`)
        console.log(`${chalk.bold('Signature:')} ${response.payload.signature}`)
        console.log(
          `${chalk.bold('Network:')} ${getChainName(response.payload.chainId)}`
        )
      }
    })
  })

  // Signing message
  const messageToSign = entityId
  const message = await dcl.getAddressAndSignature(messageToSign)

  if (message.responseType !== 'scene-deploy') return

  const { signature, address, chainId } = message.payload

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
    spinner.fail('Could not upload content')
    fail(ErrorType.DEPLOY_ERROR, error)
  }
}

function findPointers(sceneJson: any): string[] {
  return sceneJson.scene.parcels
}

function cropLastSlash(str: string) {
  return str.replace(/\/?$/, '')
}
