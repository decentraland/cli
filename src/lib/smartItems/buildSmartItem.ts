import path from 'path'
import fs from 'fs-extra'

import buildProject from '../../utils/buildProject'

export async function buildSmartItem(workingDir: string): Promise<void> {
  const gamePath = path.resolve(workingDir, 'src', 'game.ts')
  const gameFile = await fs.readFile(gamePath, 'utf-8')
  await fs.writeFile(gamePath, gameFile.replace(/\n/g, '\n//'), 'utf-8')
  await buildProject(workingDir)
  return fs.writeFile(gamePath, gameFile, 'utf-8')
}
