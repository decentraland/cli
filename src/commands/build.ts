import * as arg from 'arg'
import chalk from 'chalk'

import { buildTypescript, checkECSVersions } from '../utils/moduleHelpers'
import { isTypescriptProject } from '../project/isTypescriptProject'

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

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']

  if (!skipVersionCheck) {
    await checkECSVersions(workDir)
  }

  if (await isTypescriptProject(workDir)) {
    await buildTypescript({
      workingDir: workDir,
      watch: !!args['--watch'],
      production: !!args['--production']
    })
  }

  return 0
}
