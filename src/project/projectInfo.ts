import path from 'path'
import fs from 'fs-extra'
import { sdk } from '@dcl/schemas'

type Json = Record<string, string>
export type ProjectInfo = {
  sceneId: string
  sceneType: sdk.ProjectType
}

export function getProjectInfo(workDir: string): ProjectInfo {
  const assetJsonPath = path.resolve(workDir, 'asset.json')
  if (fs.existsSync(assetJsonPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const assetJson: Json = require(assetJsonPath)
      if (assetJson?.id && assetJson?.assetType === 'portable-experience') {
        return {
          sceneId: assetJson.id,
          sceneType: sdk.ProjectType.PORTABLE_EXPERIENCE
        }
      }
    } catch (err) {
      console.error(`Unable to load asset.json properly, please check it.`, err)
    }
  }
  return {
    sceneId: '',
    sceneType: sdk.ProjectType.SCENE
  }
}
