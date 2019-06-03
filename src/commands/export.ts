import * as path from 'path'
import * as fs from 'fs-extra'
import * as arg from 'arg'
import chalk from 'chalk'

import * as spinner from '../utils/spinner'
import isECSProject from '../utils/isECSProject'
import buildProject from '../utils/buildProject'
import { warning } from '../utils/logging'
import { Watcher } from '../lib/Watcher'

export const help = () => `
  Usage: ${chalk.bold('dcl export [path]')}

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

  const workDir = args._[1] ? path.resolve(process.cwd(), args._[1]) : process.cwd()
  const exportDir = path.resolve(workDir, args['--out'] || 'export')

  spinner.create('Checking existance of build')

  const [sceneJson, pkg] = await Promise.all([
    fs.readJSON(path.resolve(workDir, 'scene.json')),
    fs.readJSON(path.resolve(workDir, 'package.json'))
  ])

  const mainPath = path.resolve(workDir, sceneJson.main)

  if (!(await fs.pathExists(mainPath)) && isECSProject(pkg)) {
    spinner.succeed(warning('No build found'))
    spinner.create('Building project')
    try {
      await buildProject(workDir)
    } catch (error) {
      spinner.fail('Could not build the project')
      throw new Error(error)
    }
    spinner.succeed('Project built')
  } else {
    spinner.succeed('Build found')
  }

  spinner.create('Exporting project')

  if (await fs.pathExists(exportDir)) {
    await fs.remove(exportDir)
  }

  await fs.ensureDir(exportDir)

  const ignoreFileContent = await fs.readFile(path.resolve(workDir, '.dclignore'), 'utf-8')
  const artifactPath = path.resolve(workDir, 'node_modules', 'decentraland-ecs')

  const watcher = new Watcher(workDir, ignoreFileContent)
  await watcher.initialMappingsReady

  const mappings = watcher.getMappings()

  const promises = mappings.contents.map(f =>
    fs.copy(path.resolve(workDir, f.file), path.resolve(exportDir, f.hash))
  )

  await Promise.all([
    ...promises,
    fs.writeFile(path.resolve(exportDir, 'mappings'), JSON.stringify(mappings), 'utf-8'),
    fs.copy(path.resolve(workDir, 'scene.json'), path.resolve(exportDir, 'scene.json')),
    fs.copy(
      path.resolve(artifactPath, 'artifacts/unity'),
      path.resolve(exportDir, '@/artifacts/unity')
    ),
    fs.copy(path.resolve(artifactPath, 'artifacts/unity'), path.resolve(exportDir, 'unity')),
    fs.copy(
      path.resolve(artifactPath, 'artifacts/preview.js'),
      path.resolve(exportDir, '@/artifacts/preview.js')
    ),
    fs.copy(
      path.resolve(artifactPath, 'artifacts/preview.html'),
      path.resolve(exportDir, 'index.html')
    )
  ])

  spinner.succeed('Export successful.')
  return 0
}
