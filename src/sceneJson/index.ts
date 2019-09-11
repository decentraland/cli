import * as path from 'path'
import * as fs from 'fs-extra'

import { SceneMetadata } from './types'

let sceneFile: SceneMetadata

export async function getSceneFile(
  workingDir: string,
  cache: boolean = true
): Promise<SceneMetadata> {
  if (cache && sceneFile) {
    return sceneFile
  }

  sceneFile = await fs.readJSON(path.resolve(workingDir, 'scene.json'))
  return sceneFile
}

export async function setSceneFile(sceneFile: SceneMetadata, workingDir: string): Promise<void> {
  return fs.writeJSON(path.resolve(workingDir, 'scene.json'), sceneFile)
}
