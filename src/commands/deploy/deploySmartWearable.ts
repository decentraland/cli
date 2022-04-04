import chalk from 'chalk'
import { ChainId, getChainName, sdk } from '@dcl/schemas'
import opn from 'opn'
import * as path from 'path'

import { Decentraland } from '../../lib/Decentraland'
import { IFile } from '../../lib/Project'
import {
  LinkerResponse,
  LinkerResponseIdentity
} from '@dcl/linker-dapp/types/modules/server/utils'
import * as spinner from '../../utils/spinner'
import { BodyShapeType, BuilderClient, ItemFactory } from '@dcl/builder-client'
import { readFile, readJSON, writeFile } from 'fs-extra'
import { validate as validateUUID } from 'uuid'
import { warning } from '../../utils/logging'
import inquirer from 'inquirer'

export default async function ({ dcl }: { dcl: Decentraland }) {
  const project = dcl.workspace.getSingleProject()!
  const assetJsonPath = path.resolve(
    project.getProjectWorkingDir(),
    'asset.json'
  )
  const assetJson = await readJSON(assetJsonPath)

  console.log(chalk.bold('[BETA] This feature is a beta one.'))

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
  if (!validateUUID(collectionId)) {
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
        } else if (validateUUID(answers.uuid)) {
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

  let originalFilesToIgnore = await project.getDCLIgnore()
  if (originalFilesToIgnore === null) {
    originalFilesToIgnore = await project.writeDclIgnore()
  }

  const content: Record<string, Uint8Array> = {}
  const files: IFile[] = await project.getFiles(originalFilesToIgnore)
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

  const builtItem = await item.build()

  spinner.succeed('Smart wearable built!')

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
      if (response.responseType === 'identity') {
        spinner.succeed(`Identity successfully created and signed.`)
        console.log(`${chalk.bold('Address:')}`, response.payload.address)
        console.log(
          `${chalk.bold('Network:')} ${getChainName(response.payload.chainId)}`
        )
      }
    })
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

  if (!process.env.DCL_IDENTITY) {
    const results = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      message: `Do you want to save the deployment Identity? This will avoid to open the linker again in this console session (this does NOT store your private key).`
    })

    if (results.continue) {
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
}

async function getSavedIdentity(): Promise<LinkerResponseIdentity | undefined> {
  if (process.env['DCL_IDENTITY']) {
    const results = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      message: `Do you want to use the saved deployment Identity?`
    })

    if (results.continue) {
      return JSON.parse(
        atob(process.env['DCL_IDENTITY'])
      ) as LinkerResponseIdentity
    }
  }
}
