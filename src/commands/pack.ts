import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
import { sdk } from '@dcl/schemas'

import * as spinner from '../utils/spinner'
import { packProject } from '../lib/smartItems/packProject'
import { buildSmartItem } from '../lib/smartItems/buildSmartItem'
import getProjectFilePaths from '../utils/getProjectFilePaths'
import { buildTypescript } from '../utils/moduleHelpers'
import { fail } from 'assert'
import { createWorkspace } from '../lib/Workspace'

export const help = () => `
  Usage: ${chalk.bold('dcl pack [options]')}

    ${chalk.dim('There are no available options yet (experimental feature)')}

    ${chalk.dim('Example:')}

    - Pack your project into a .zip file:

      ${chalk.green('$ dcl pack')}
`

export async function main(): Promise<number> {
  const workingDir = process.cwd()
  const workspace = createWorkspace({ workingDir })
  const project = workspace.getSingleProject()

  if (project === null) {
    fail("You should't use `dcl pack` in a workspace folder.")
  }

  const projectInfo = project.getInfo()

  const zipFileName =
    projectInfo.sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE ? 'portable-experience.zip' : 'item.zip'

  try {
    if (projectInfo.sceneType === sdk.ProjectType.SMART_ITEM) {
      await buildSmartItem(workingDir)
    } else if (projectInfo.sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE) {
      await buildTypescript({
        workingDir,
        watch: false,
        production: true
      })
    }
  } catch (error) {
    console.error('Could not build the project properly, please check errors.', error)
  }

  spinner.create('Packing project')

  const ignoreFileContent = await fs.readFile(path.resolve(workingDir, '.dclignore'), 'utf-8')
  const filePaths = await getProjectFilePaths(workingDir, ignoreFileContent)

  let totalSize = 0
  for (const filePath of filePaths) {
    const stat = fs.statSync(filePath)
    if (stat.isFile()) {
      totalSize += stat.size
    }
  }

  if (projectInfo.sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE) {
    const MAX_WEARABLE_SIZE = 2097152
    const MAX_WEARABLE_SIZE_MB = Math.round(MAX_WEARABLE_SIZE / 1024 / 1024)
    if (totalSize > MAX_WEARABLE_SIZE) {
      console.error(`The sumatory of all packed files exceed the limit of wearable size (${MAX_WEARABLE_SIZE_MB}MB - ${MAX_WEARABLE_SIZE} bytes).
Please try to remove unneccessary files and/or reduce the files size, you can ignore file adding in .dclignore.`)
    }
  }

  const packDir = path.resolve(workingDir, zipFileName)
  await fs.remove(packDir)
  await packProject(filePaths, packDir)

  spinner.succeed(
    `Pack successful. Total size: ${Math.round((totalSize * 100) / 1024 / 1024) / 100}MB - ${totalSize} bytes`
  )
  return 0
}
