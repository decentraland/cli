import { Scene } from '@dcl/schemas'

import { getSceneFile, setSceneFile } from '.'

export async function lintSceneFile(workingDir: string): Promise<void> {
  const sceneFile = await getSceneFile(workingDir)
  const finalScene: Scene = {
    ...sceneFile,
    scene: {
      ...sceneFile.scene,
      base: sceneFile.scene.base.replace(/\ /g, ''),
      parcels: sceneFile.scene.parcels.map((coords) =>
        coords.replace(/\ /g, '')
      )
    }
  }

  if (JSON.stringify(sceneFile) !== JSON.stringify(finalScene)) {
    return setSceneFile(finalScene, workingDir)
  }
}
