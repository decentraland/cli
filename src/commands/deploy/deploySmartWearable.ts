import chalk from 'chalk'
import { ChainId, getChainName, sdk } from '@dcl/schemas'
import opn from 'opn'
import * as path from 'path'

import { Decentraland } from '../../lib/Decentraland'
import { IFile } from '../../lib/Project'
import { LinkerResponse } from '../../lib/LinkerAPI'
import * as spinner from '../../utils/spinner'
import { BodyShapeType, BuilderClient, ItemFactory } from '@dcl/builder-client'
import { readFile, readJSON } from 'fs-extra'

export default async function ({ dcl }: { dcl: Decentraland }) {
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

  const linkerResponse = await dcl.getIdentity()
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
  await client.upsertItem(builtItem.item, builtItem.newContent)

  spinner.succeed('Wearable uploaded succesfully!')
}
