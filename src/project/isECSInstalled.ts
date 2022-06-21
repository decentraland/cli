import path from 'path'
import fs from 'fs-extra'

export default async function isECSInstalled(
  workingDir: string
): Promise<boolean> {
  const ECSPath = path.resolve(workingDir, 'node_modules', '@dcl/sdk')
  return fs.pathExists(ECSPath)
}
