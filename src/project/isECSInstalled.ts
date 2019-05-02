import * as path from 'path'
import * as fs from 'fs-extra'

export default async function isECSInstalled(workingDir: string): Promise<boolean> {
  const ECSPath = path.resolve(workingDir, 'node_modules', 'decentraland-ecs')
  return fs.pathExists(ECSPath)
}
