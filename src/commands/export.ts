import * as path from 'path'
import * as fs from 'fs-extra'
import * as arg from 'arg'
import chalk from 'chalk'

import * as spinner from '../utils/spinner'
import getProjectFilePaths from '../utils/getProjectFilePaths'
import getDummyMappings from '../utils/getDummyMappings'
import buildProject from '../utils/buildProject'
import { warning, debug } from '../utils/logging'
import { SceneMetadata } from '../sceneJson/types'
import { lintSceneFile } from '../sceneJson/lintSceneFile'
import { getSceneFile } from '../sceneJson'

export const help = () => `
  Usage: ${chalk.bold('dcl export [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -o, --out                 Output directory for build (defaults to "export")

    ${chalk.dim('Example:')}

    - Export your scene into static files:

      ${chalk.green('$ dcl export')}
`

export async function main(): Promise<number> {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--out': String,
    '-o': '--out'
  })

  const workDir = process.cwd()
  const exportDir = path.resolve(workDir, args['--out'] || 'export')
  debug(`Using export directory: ${exportDir}`)

  spinner.create('Checking existance of build')

  await lintSceneFile(workDir)
  const sceneJson: SceneMetadata = await getSceneFile(workDir)
  const mainPath = path.resolve(workDir, sceneJson.main)

  if (!(await fs.pathExists(mainPath))) {
    spinner.succeed(warning('No build found'))
    try {
      await buildProject(workDir)
    } catch (error) {
      spinner.fail('Could not build the project')
      throw new Error(error)
    }
  } else {
    spinner.succeed('Build found')
  }

  spinner.create('Exporting project')

  if (await fs.pathExists(exportDir)) {
    await fs.remove(exportDir)
  }

  const ignoreFileContent = await fs.readFile(path.resolve(workDir, '.dclignore'), 'utf-8')
  const filePaths = await getProjectFilePaths(workDir, ignoreFileContent)

  const promises = filePaths.map(f => fs.copy(path.resolve(workDir, f), path.resolve(exportDir, f)))
  await Promise.all(promises)

  const artifactPath = path.resolve(workDir, 'node_modules', 'decentraland-ecs', 'artifacts')
  const mappings = getDummyMappings(filePaths)

  // Change HTML title name
  const content = await fs.readFile(path.resolve(artifactPath, 'export.html'), 'utf-8')
  const finalContent = content.replace('{{ scene.display.title }}', sceneJson.display.title)

  try {
    // decentraland-ecs <= 6.6.4
    await fs.copy(path.resolve(artifactPath, 'unity'), path.resolve(exportDir, 'unity'))
  } catch {
    // decentraland-ecs > 6.6.4
    await fs.copy(
      path.resolve(artifactPath, 'unity-renderer'),
      path.resolve(exportDir, 'unity-renderer')
    )
  }

  await Promise.all([
    fs.writeFile(path.resolve(exportDir, 'index.html'), finalContent, 'utf-8'),
    fs.writeFile(path.resolve(exportDir, 'mappings'), JSON.stringify(mappings), 'utf-8'),
    fs.copy(path.resolve(artifactPath, 'preview.js'), path.resolve(exportDir, 'preview.js')),

    fs.copy(
      path.resolve(artifactPath, 'default-profile'),
      path.resolve(exportDir, 'default-profile')
    ),
    fs.copy(
      path.resolve(artifactPath, 'images/decentraland-connect'),
      path.resolve(exportDir, 'images/decentraland-connect')
    ),
    fs.copy(
      path.resolve(artifactPath, 'images/progress-logo.png'),
      path.resolve(exportDir, 'images/progress-logo.png')
    ),
    fs.copy(
      path.resolve(artifactPath, 'images/teleport.gif'),
      path.resolve(exportDir, 'images/teleport.gif')
    )
  ])

  spinner.succeed('Export successful.')
  return 0
}
