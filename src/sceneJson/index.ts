import { Scene } from '@dcl/schemas'
import path from 'path'
import fs from 'fs-extra'

let sceneFile: Scene

export async function getSceneFile(workingDir: string, cache: boolean = true): Promise<Scene> {
  if (cache && sceneFile) {
    return sceneFile
  }

  sceneFile = await fs.readJSON(path.resolve(workingDir, 'scene.json'))
  return sceneFile
}

export async function setSceneFile(sceneFile: Scene, workingDir: string): Promise<void> {
  return fs.writeJSON(path.resolve(workingDir, 'scene.json'), sceneFile, {
    spaces: 2
  })
}
