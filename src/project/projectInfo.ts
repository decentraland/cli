import path from 'path'
import fs, { readJsonSync } from 'fs-extra'
import { sdk } from '@dcl/schemas'
import { ASSET_JSON_FILE, WEARABLE_JSON_FILE } from '../utils/project'

export type ProjectInfo = {
  sceneId: string
  sceneType: sdk.ProjectType
}

export function getProjectInfo(workDir: string): ProjectInfo | null {
  const assetJsonPath = path.resolve(workDir, ASSET_JSON_FILE)
  if (fs.existsSync(assetJsonPath)) {
    // Validate, if is not valid, return null

    return {
      sceneId: 'b64-' + Buffer.from(workDir).toString('base64'),
      sceneType: sdk.ProjectType.SMART_ITEM
    }
  }

  const wearableJsonPath = path.resolve(workDir, WEARABLE_JSON_FILE)
  if (fs.existsSync(wearableJsonPath)) {
    try {
      const wearableJson = readJsonSync(wearableJsonPath)
      if (sdk.AssetJson.validate(wearableJson)) {
        if (wearableJson.assetType === sdk.ProjectType.PORTABLE_EXPERIENCE) {
          return {
            sceneId: wearableJson.id,
            sceneType: sdk.ProjectType.PORTABLE_EXPERIENCE
          }
        }
      } else {
        const errors = (sdk.AssetJson.validate.errors || [])
          .map((a) => `${a.dataPath} ${a.message}`)
          .join('')

        console.error(
          `Unable to validate ${WEARABLE_JSON_FILE} properly, please check it.`,
          errors
        )

        return null
      }
    } catch (err) {
      console.error(
        `Unable to load ${WEARABLE_JSON_FILE} properly, please check it.`,
        err
      )
    }
  }

  return {
    sceneId: 'b64-' + Buffer.from(workDir).toString('base64'),
    sceneType: sdk.ProjectType.SCENE
  }
}
