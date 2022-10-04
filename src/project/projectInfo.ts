import { sdk } from '@dcl/schemas'
import { WearableJson } from '@dcl/schemas/dist/sdk'
import fs, { readJsonSync } from 'fs-extra'
import path from 'path'
import { ASSET_JSON_FILE, WEARABLE_JSON_FILE } from '../utils/project'

export type ProjectInfo = {
  sceneId: string
  sceneType: sdk.ProjectType
}

export function smartWearableNameToId(name: string) {
  return name.toLocaleLowerCase().replace(/ /g, '-')
}

export function getProjectInfo(workDir: string): ProjectInfo | null {
  const wearableJsonPath = path.resolve(workDir, WEARABLE_JSON_FILE)
  if (fs.existsSync(wearableJsonPath)) {
    try {
      const wearableJson = readJsonSync(wearableJsonPath)
      if (WearableJson.validate(wearableJson)) {
        return {
          sceneId: smartWearableNameToId(wearableJson.name),
          sceneType: sdk.ProjectType.PORTABLE_EXPERIENCE
        }
      } else {
        const errors = (WearableJson.validate.errors || [])
          .map((a) => `${a.data} ${a.message}`)
          .join('')

        if (errors.length > 0) {
          console.error(
            `Unable to validate '${WEARABLE_JSON_FILE}' properly, please check it: ${errors}`
          )
        } else {
          console.error(
            `Unable to validate '${WEARABLE_JSON_FILE}' properly, please check it.`
          )
        }
        return null
      }
    } catch (err) {
      console.error(
        `Unable to load ${WEARABLE_JSON_FILE} properly, please check it.`,
        err
      )
      return null
    }
  }

  const assetJsonPath = path.resolve(workDir, ASSET_JSON_FILE)
  if (fs.existsSync(assetJsonPath)) {
    // Validate, if is not valid, return null
    const assetJson = readJsonSync(assetJsonPath)
    if (assetJson.assetType) {
      const docUrl =
        'https://docs.decentraland.org/development-guide/smart-wearables/'
      console.error(`Field assetType was used to discern smart wearable from smart item, but it's no longer support.
      Please if you're trying to develop a smart wearable read the docs, you probably need to change the 'asset.json' to 'wearable.json'.
      This 'wearable.json' has a different format that previous one.
      More information: ${docUrl}`)
      return null
    }

    return {
      sceneId: 'b64-' + Buffer.from(workDir).toString('base64'),
      sceneType: sdk.ProjectType.SMART_ITEM
    }
  }

  return {
    sceneId: 'b64-' + Buffer.from(workDir).toString('base64'),
    sceneType: sdk.ProjectType.SCENE
  }
}
