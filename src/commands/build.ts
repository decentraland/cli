import arg from 'arg'
import chalk from 'chalk'

import { buildTypescript } from '../utils/moduleHelpers'
import { isTypescriptProject } from '../project/isTypescriptProject'
import { createWorkspace } from '../lib/Workspace'
import { fail } from 'assert'

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
    '--watch': String,
    '-w': '--watch',
    '--skip-version-checks': Boolean,
    '--production': Boolean,
    '-p': '--production'
  })

  const workingDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const workspace = createWorkspace({ workingDir })

  if (!workspace.isSingleProject()) {
    fail(`Can not build a workspace. It isn't supported yet.`)
  }

  if (!skipVersionCheck) {
    await workspace.getSingleProject()!.checkCLIandECSCompatibility()
  }

  if (await isTypescriptProject(workingDir)) {
    await buildTypescript({
      workingDir: workingDir,
      watch: !!args['--watch'],
      production: !!args['--production']
    })
  }

  return 0
}
