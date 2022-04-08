import chalk from 'chalk'
import { ChainId, getChainName, sdk } from '@dcl/schemas'
import * as path from 'path'

import { Decentraland } from '../../lib/Decentraland'
import { IFile } from '../../lib/Project'
import {
  LinkerResponse,
  LinkerResponseIdentity
} from '@dcl/linker-dapp/types/modules/server/utils'
import * as spinner from '../../utils/spinner'
import {
  BodyShapeType,
  BuilderClient,
  BuiltItem,
  ItemFactory
} from '@dcl/builder-client'
import { readFile, readJSON, writeFile } from 'fs-extra'
import * as uuid from 'uuid'
import { warning } from '../../utils/logging'
import inquirer from 'inquirer'
import arg from 'arg'
import { isEnvCi } from '../../utils/env'
import { deployLinkerReady, failWithSpinner } from './utils'

export default async function ({
  dcl,
  files
}: {
  dcl: Decentraland
  files: IFile[]
}) {
  const args = arg({
    '--save-identity': Boolean
  })

  const project = dcl.workspace.getSingleProject()!
  const assetJsonPath = path.resolve(
    project.getProjectWorkingDir(),
    'asset.json'
  )
  const assetJson = await readJSON(assetJsonPath)

  console.log(chalk.bold('[BETA] This is a beta feature.'))

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

  let collectionId = (assetJson as any)?.collectionId || ''
  if (!uuid.validate(collectionId)) {
    const results = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      message: warning(
        `You haven't assigned a valid collection ID. Using collection can help to group wearables and test them. Do you want to assign one? It should already exist.`
      )
    })

    if (results.continue) {
      while (true) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'uuid',
            message: 'Destination collection (a valid UUID, empty to skip):'
          }
        ])

        const ans = (answers.uuid as string) || ''
        if (ans.length === 0) {
          console.info(`Skipping collection ID.`)
          break
        } else if (uuid.validate(answers.uuid)) {
          collectionId = answers.uuid
          console.info(`Using collection ID: ${collectionId}`)
          const newAssetJson = { ...assetJson, collectionId }
          await writeFile(assetJsonPath, JSON.stringify(newAssetJson, null, 2))
          break
        } else {
          console.error('This is not a valid UUID.')
        }
      }
    } else {
      console.info(`Skipping collection ID.`)
    }
  } else {
    console.info(`Using collection ID : ${collectionId}`)
  }

  spinner.create('Building smart wearable')

  const assetBasicConfig = assetJson as sdk.AssetJson
  const thumbnailContent = await readFile(
    path.resolve(project.getProjectWorkingDir(), assetBasicConfig.thumbnail)
  )

  // Building item logic
  let buildingItem: BuiltItem<Uint8Array> | null = null
  try {
    const content: Record<string, Uint8Array> = {}
    for (const file of files) {
      content[file.path] = new Uint8Array(file.content.buffer, 0)
    }
    content['thumbnail.png'] = content[assetBasicConfig.thumbnail]
    delete content['asset.json']

    const item = new ItemFactory<Uint8Array>()
      .newItem({
        id: assetBasicConfig.id,
        name: assetBasicConfig.name,
        description: assetBasicConfig.description,
        rarity: assetBasicConfig.rarity
      })
      .withCategory(assetBasicConfig.category as any)
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

    if (collectionId) {
      item.withCollectionId(collectionId)
    }

    buildingItem = await item.build()

    spinner.succeed('Smart wearable built!')
  } catch (err) {
    failWithSpinner('The wearable build failed.', err)
  }

  const builtItem = buildingItem!
  deployLinkerReady(dcl, (response: LinkerResponse) => {
    if (response.responseType === 'identity') {
      spinner.succeed(`Identity successfully created and signed.`)
      console.log(`${chalk.bold('Address:')}`, response.payload.address)
      console.log(
        `${chalk.bold('Network:')} ${getChainName(response.payload.chainId)}`
      )
    }
  })

  const savedIdentity = await getSavedIdentity()
  const linkerResponse = savedIdentity || (await dcl.getIdentity())
  const builderServerUrl =
    linkerResponse.payload.chainId === ChainId.ETHEREUM_MAINNET
      ? 'https://builder-api.decentraland.org'
      : 'https://builder-api.decentraland.io'

  spinner.create('Uploading content to builder')

  const client = new BuilderClient(
    builderServerUrl,
    linkerResponse.payload.identity,
    linkerResponse.payload.address
  )

  const remoteItem = await client.upsertItem(
    builtItem.item,
    builtItem.newContent
  )

  spinner.succeed('Wearable uploaded succesfully!')

  if (
    remoteItem.collection_id &&
    linkerResponse.payload.chainId === ChainId.ETHEREUM_MAINNET
  ) {
    const url = `https://play.decentraland.zone/?NETWORK=ropsten&WITH_COLLECTIONS=${remoteItem.collection_id}&position=0%2C0`
    spinner.create('')
    spinner.succeed(`\nYou can test the wearable opening the URL, you must use the same wallet that you used to sign the deployment: 
      ${url}
    `)
  }

  if (!process.env.DCL_IDENTITY && args['--save-identity']) {
    const value = btoa(JSON.stringify(linkerResponse))
    if (process.platform === 'win32') {
      console.info(
        'Run the next command to save the identity:\n\tset DCL_IDENTITY=' +
          value
      )
    } else {
      console.info(
        'Run the next command to save the identity:\n\texport DCL_IDENTITY=' +
          value
      )
    }
  }
}

async function getSavedIdentity(): Promise<LinkerResponseIdentity | undefined> {
  if (process.env['DCL_IDENTITY']) {
    const identity = JSON.parse(
      atob(process.env['DCL_IDENTITY'])
    ) as LinkerResponseIdentity

    if (isEnvCi()) {
      return identity
    }

    const results = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      message: `Do you want to use the saved deployment Identity?`
    })

    if (results.continue) {
      return identity
    }
  }
}
