import * as path from 'path'
import * as fs from 'fs-extra'

export async function isTypescriptProject(projectPath: string): Promise<boolean> {
  const tsconfigPath = path.resolve(projectPath, 'tsconfig.json')
  return fs.pathExists(tsconfigPath)
}
