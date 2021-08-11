import * as arg from 'arg'
import chalk from 'chalk'

import { buildTypescript, checkECSVersions } from '../utils/moduleHelpers'
import { isTypescriptProject } from '../project/isTypescriptProject'

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change

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
    '--skip-version-checks': Boolean
  })

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']

  if (!skipVersionCheck) {
    await checkECSVersions(workDir)
  }

  if (await isTypescriptProject(workDir)) {
    await buildTypescript(workDir, !!args['--watch'])
  }

  return 0
}
