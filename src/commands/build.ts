import arg from 'arg'
import chalk from 'chalk'

import { fail } from 'assert'
import { Decentraland } from '../lib/Decentraland'
import installDependencies from '../project/installDependencies'
import updateBundleDependenciesField from '../project/updateBundleDependenciesField'
import { Analytics } from '../utils/analytics'
import { buildTypescript, isOnline } from '../utils/moduleHelpers'

export const help = () => `
  Usage: ${chalk.bold('dcl build [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -w, --watch               Watch for file changes and build on change
      -p, --production          Build without sourcemaps
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-install            Skip installing dependencies
      --anon
      
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
    '-p': '--production',
    '--skip-install': Boolean,
    '--anon': Boolean
  })

  const dcl = new Decentraland({
    watch: args['--watch'] || args['-w'] || false,
    workingDir: process.cwd()
  })
  const anonymousBuild = !!args['--anon']
  const skipVersionCheck = args['--skip-version-checks']
  const skipInstall = args['--skip-install']
  const online = await isOnline()
  const errors = []

  for (const project of dcl.workspace.getAllProjects()) {
    const needDependencies = await project.needsDependencies()

    if (needDependencies && !skipInstall) {
      if (online) {
        await installDependencies(
          project.getProjectWorkingDir(),
          false /* silent */
        )
      } else {
        fail(
          'This project can not start as you are offline and dependencies need to be installed.'
        )
      }
    }

    if (!skipVersionCheck) {
      await project.checkCLIandECSCompatibility()
    }

    try {
      await updateBundleDependenciesField({
        workDir: project.getProjectWorkingDir()
      })
    } catch (err) {
      console.warn(`Unable to update bundle dependencies field.`, err)
    }

    if (await project.isTypescriptProject()) {
      try {
        await buildTypescript({
          workingDir: project.getProjectWorkingDir(),
          watch: !!args['--watch'],
          production: !!args['--production']
        })
      } catch (err) {
        errors.push({ project, err })
      }
    }
  }

  if (errors.length) {
    const projectList = errors
      .map((item) => item.project.getProjectWorkingDir())
      .join('\n\t')

    throw new Error(
      `Error compiling (see logs above) the scenes: \n\t${projectList}`
    )
  }

  if (!anonymousBuild) {
    if (dcl.workspace.isSingleProject()) {
      const baseCoords = await dcl.workspace.getBaseCoords()
      Analytics.buildScene({
        projectHash: dcl.getProjectHash(),
        ecs: await dcl.workspace.getSingleProject()!.getEcsPackageVersion(),
        coords: baseCoords,
        isWorkspace: false
      })
    } else {
      Analytics.buildScene({
        projectHash: dcl.getProjectHash(),
        isWorkspace: true
      })
    }
  }

  return 0
}
