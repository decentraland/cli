import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'

import * as spinner from '../utils/spinner'
import { packProject } from '../lib/smartItems/packProject'
import { buildSmartItem } from '../lib/smartItems/buildSmartItem'
import getProjectFilePaths from '../utils/getProjectFilePaths'

export const help = () => `
  Usage: ${chalk.bold('dcl pack [options]')}

    ${chalk.dim('There are no available options yet (experimental feature)')}

    ${chalk.dim('Example:')}

    - Pack your smart item into a .zip file:

      ${chalk.green('$ dcl pack')}
`

export async function main(): Promise<number> {
  const workDir = process.cwd()

  try {
    await buildSmartItem(workDir)
  } catch (error) {
    spinner.fail('Could not build the project')
    throw new Error(error)
  }

  spinner.create('Packing project')
  const packDir = path.resolve(workDir, 'item.zip')
  await fs.remove(packDir)
  const files = await getProjectFilePaths(workDir)
  await packProject(files, packDir)
  spinner.succeed('Pack successful.')
  return 0
}
