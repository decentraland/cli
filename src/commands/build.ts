import arg from 'arg'
import chalk from 'chalk'

import { buildTypescript } from '../utils/moduleHelpers'
import { isTypescriptProject } from '../project/isTypescriptProject'
import { fail } from 'assert'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change
      -p, --production          Build without sourcemaps
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway

    ${chalk.dim('Example:')}

    - Build your scene:

    ${chalk.green('$ dcl build')}
`

export async function main(): Promise<number> {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--watch': Boolean,
    '-w': '--watch',
    '--skip-version-checks': Boolean,
    '--production': Boolean,
    '-p': '--production'
  })

  const dcl = new Decentraland({
    watch: args['--watch'] || args['-w'] || false,
    workingDir: process.cwd()
  })

  const workingDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']

  if (!dcl.workspace.isSingleProject()) {
    fail(`Can not build a workspace. It isn't supported yet.`)
  }

  if (!skipVersionCheck) {
    await dcl.workspace.getSingleProject()!.checkCLIandECSCompatibility()
  }

  if (await isTypescriptProject(workingDir)) {
    await buildTypescript({
      workingDir: workingDir,
      watch: !!args['--watch'],
      production: !!args['--production']
    })
  }

  const baseCoords = await dcl.workspace.getBaseCoords()
  Analytics.buildScene({
    projectHash: dcl.getProjectHash(),
    ecs: await dcl.workspace.getSingleProject()!.getEcsPackageVersion(),
    coords: baseCoords,
    isWorkspace: false
  })

  return 0
}
