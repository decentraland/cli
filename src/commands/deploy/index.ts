import arg from 'arg'
import chalk from 'chalk'
import { sdk } from '@dcl/schemas'

import { isTypescriptProject } from '../../project/isTypescriptProject'
import { Decentraland } from '../../lib/Decentraland'
import * as spinner from '../../utils/spinner'
import { buildTypescript, checkECSVersions } from '../../utils/moduleHelpers'
import { Analytics } from '../../utils/analytics'
import { ErrorType, fail } from '../../utils/errors'

import deploySmartWearable from './deploySmartWearable'
import deployScene from './deployScene'

export const help = () => `
  Usage: ${chalk.bold('dcl deploy [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -t, --target              Specifies the address and port for the target catalyst server. Defaults to peer.decentraland.org
      -t, --target-content      Specifies the address and port for the target content server. Example: 'peer.decentraland.org/content'. Can't be set together with --target
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build before deploy

    ${chalk.dim('Example:')}

    - Deploy your scene:

      ${chalk.green('$ dcl deploy')}

    - Deploy your scene to a specific content server:

    ${chalk.green('$ dcl deploy --target my-favorite-catalyst-server.org:2323')}
`

export function failWithSpinner(message: string, error?: any): void {
  spinner.fail(message)
  fail(ErrorType.DEPLOY_ERROR, error)
}

export async function main(): Promise<void> {
  const args = arg({
    '--help': Boolean,
    '-h': '--help',
    '--target': String,
    '-t': '--target',
    '--target-content': String,
    '-tc': '--target-content',
    '--skip-version-checks': Boolean,
    '--skip-build': Boolean,
    '--https': Boolean,
    '--force-upload': Boolean,
    '--yes': Boolean
  })

  Analytics.deploy()

  const workDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const skipBuild = args['--skip-build']
  const target = args['--target']
  const targetContent = args['--target-content']

  if (target && targetContent) {
    throw new Error(
      `You can't set both the 'target' and 'target-content' arguments.`
    )
  }

  if (!skipVersionCheck) {
    await checkECSVersions(workDir)
  }

  spinner.create('Building scene in production mode')

  if (!(await isTypescriptProject(workDir))) {
    failWithSpinner(
      `Please make sure that your project has a 'tsconfig.json' file.`
    )
  }

  if (!skipBuild) {
    try {
      await buildTypescript({
        workingDir: workDir,
        watch: false,
        production: true,
        silence: true
      })
      spinner.succeed('Scene built successfully')
    } catch (error) {
      const message = 'Build /scene in production mode failed'
      failWithSpinner(message, error)
    }
  } else {
    spinner.succeed()
  }

  spinner.create('Creating deployment structure')

  const dcl = new Decentraland({
    isHttps: !!args['--https'],
    workingDir: workDir,
    forceDeploy: args['--force-upload'],
    yes: args['--yes']
  })

  const project = dcl.workspace.getSingleProject()
  if (!project) {
    return failWithSpinner(
      'Cannot deploy a workspace, please go to the project directory and run `dcl deploy` again there.'
    )
  } else if (project.getInfo().sceneType === sdk.ProjectType.SMART_ITEM) {
    return failWithSpinner('Cannot deploy a smart item.')
  }

  if (project.getInfo().sceneType === sdk.ProjectType.SCENE) {
    await deployScene({ dcl, target, targetContent })
  } else if (
    project.getInfo().sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE
  ) {
    spinner.create('Building smart wearable')
    await deploySmartWearable({ dcl })
  }
}
