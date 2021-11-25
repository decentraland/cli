import path from 'path'
import fs from 'fs-extra'
import { sdk } from '@dcl/schemas'

export type ProjectInfo = {
  sceneId: string
  sceneType: sdk.ProjectType
}

export function getProjectInfo(workDir: string): ProjectInfo {
  const assetJsonPath = path.resolve(workDir, 'asset.json')
  if (fs.existsSync(assetJsonPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const assetJson = require(assetJsonPath)
      if (sdk.AssetJson.validate(assetJson)){
        if (assetJson.assetType == sdk.ProjectType.PORTABLE_EXPERIENCE){
          return {
            sceneId: assetJson.id,
            sceneType: sdk.ProjectType.PORTABLE_EXPERIENCE
          }
        }
      }else{
        console.error(`Unable to validate asset.json properly, please check it.`)
      }
    } catch (err) {
      console.error(`Unable to load asset.json properly, please check it.`, err)
    }

    return {
      sceneId: '',
      sceneType: sdk.ProjectType.SMART_ITEM
    }
  }
  return {
    sceneId: '',
    sceneType: sdk.ProjectType.SCENE
  }
}
