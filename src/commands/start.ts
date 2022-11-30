import os from 'os'
import arg from 'arg'
import chalk from 'chalk'
import opn from 'opn'

import { Decentraland } from '../lib/Decentraland'
import {
  buildTypescript,
  getOutdatedEcs,
  isECSVersionLower,
  isOnline
} from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { error, formatOutdatedMessage } from '../utils/logging'
import { isEnvCi } from '../utils/env'
import * as spinner from '../utils/spinner'
import installDependencies from '../project/installDependencies'
import { lintSceneFile } from '../sceneJson/lintSceneFile'
import updateBundleDependenciesField from '../project/updateBundleDependenciesField'
import { ECSVersion } from '../lib/Project'

export const help = () => `
  Usage: ${chalk.bold('dcl start [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -d, --no-debug            Disable debugging panel
      -b, --no-browser          Do not open a new browser window
      -w, --no-watch            Do not open watch for filesystem changes
      -c, --ci                  Run the parcel previewer on a remote unix server
      --web3                    Connects preview to browser wallet to use the associated avatar and account
      --skip-version-checks     Skip the ECS and CLI version checks, avoid the warning message and launch anyway
      --skip-build              Skip build and only serve the files in preview mode
      --skip-install            Skip installing dependencies
      --desktop-client          Show URL to launch preview in the desktop client (BETA)

    ${chalk.dim('Examples:')}

    - Start a local development server for a Decentraland Scene at port 3500

      ${chalk.green('$ dcl start -p 3500')}

    - Start a local development server for a Decentraland Scene at a docker container

      ${chalk.green('$ dcl start --ci')}
`

export async function main() {
  const args = arg({
    '--help': Boolean,
    '--port': String,
    '--no-debug': Boolean,
    '--no-browser': Boolean,
    '--no-watch': Boolean,
    '--ci': Boolean,
    '--skip-version-checks': Boolean,
    '--skip-install': Boolean,
    '--web3': Boolean,
    '-h': '--help',
    '-p': '--port',
    '-d': '--no-debug',
    '-b': '--no-browser',
    '-w': '--no-watch',
    '-c': '--ci',
    '--skip-build': Boolean,
    '--desktop-client': Boolean,

    // temp and hidden property to add `&renderer-branch=dev&kernel-branch=main`
    '--sdk7-next': Boolean
  })

  const isCi = args['--ci'] || isEnvCi()
  const debug = !args['--no-debug'] && !isCi
  const openBrowser = !args['--no-browser'] && !isCi
  const skipBuild = args['--skip-build']
  const watch = !args['--no-watch'] && !isCi && !skipBuild
  const workingDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const skipInstall = args['--skip-install']

  const dcl = new Decentraland({
    previewPort: parseInt(args['--port']!, 10),
    watch,
    workingDir
  })

  const enableWeb3 = args['--web3']

  const baseCoords = await dcl.workspace.getBaseCoords()
  const hasPortableExperience = dcl.workspace.hasPortableExperience()

  const online = await isOnline()
  const ecsVersions: Set<ECSVersion> = new Set()

  for (const project of dcl.workspace.getAllProjects()) {
    if (!skipBuild) {
      spinner.create(`Checking if SDK is installed in project`)

      const needDependencies = await project.needsDependencies()

      if (needDependencies && !skipInstall) {
        if (online) {
          await installDependencies(
            project.getProjectWorkingDir(),
            false /* silent */
          )
        } else {
          spinner.fail(
            'This project can not start as you are offline and dependencies need to be installed.'
          )
        }
      }

      const ecsVersion = project.getEcsVersion()
      if (ecsVersion === 'unknown') {
        // This should only happen when we are offline and we don't have the SDK installed.
        spinner.fail('SDK not found. This project can not start.')
      }
      ecsVersions.add(ecsVersion)

      const sdkOutdated = await getOutdatedEcs(project.getProjectWorkingDir())

      if (sdkOutdated) {
        spinner.warn(
          `SDK is outdated, to upgrade to the latest version run the command:
          ${chalk.bold('npm install decentraland-ecs@latest')}
          In the folder ${project.getProjectWorkingDir()}
        `
        )
        console.log(chalk.bold(error(formatOutdatedMessage(sdkOutdated))))
      } else {
        spinner.succeed('Latest SDK installation found.')
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
        await buildTypescript({
          workingDir: project.getProjectWorkingDir(),
          watch: true,
          production: false
        })
      }
    }

    await lintSceneFile(project.getProjectWorkingDir())
  }

  if (dcl.workspace.isSingleProject()) {
    Analytics.startPreview({
      projectHash: dcl.getProjectHash(),
      ecs: await dcl.workspace.getSingleProject()!.getEcsPackageVersion(),
      coords: baseCoords,
      isWorkspace: false
    })
  } else {
    Analytics.startPreview({
      projectHash: dcl.getProjectHash(),
      isWorkspace: true
    })
  }

  if (
    (enableWeb3 || hasPortableExperience) &&
    (await isECSVersionLower(workingDir, '6.10.0')) &&
    !skipVersionCheck
  ) {
    throw new Error(
      'Web3 is not currently working with `decentraland-ecs` version lower than 6.10.0. You can update it with running `npm i decentraland-ecs@latest`.'
    )
  }

  dcl.on('preview:ready', (port) => {
    const ifaces = os.networkInterfaces()
    const availableURLs: string[] = []

    console.log('') // line break

    console.log(`Preview server is now running`)

    console.log(chalk.bold('\n  Available on:\n'))

    Object.keys(ifaces).forEach((dev) => {
      ;(ifaces[dev] || []).forEach((details) => {
        if (details.family === 'IPv4') {
          let addr = `http://${details.address}:${port}?position=${baseCoords.x}%2C${baseCoords.y}`
          if (debug) {
            addr = `${addr}&SCENE_DEBUG_PANEL`
          }
          if (enableWeb3 || hasPortableExperience) {
            addr = `${addr}&ENABLE_WEB3`
          }

          if (ecsVersions.has('ecs7')) {
            if (!!args['--sdk7-next']) {
              addr = `${addr}&ENABLE_ECS7&renderer-branch=dev&kernel-branch=main`
            } else {
              addr = `${addr}&ENABLE_ECS7`
            }
          }

          availableURLs.push(addr)
        }
      })
    })

    // Push localhost and 127.0.0.1 at top
    const sortedURLs = availableURLs.sort((a, _b) => {
      return a.toLowerCase().includes('localhost') ||
        a.includes('127.0.0.1') ||
        a.includes('0.0.0.0')
        ? -1
        : 1
    })

    for (const addr of sortedURLs) {
      console.log(`    ${addr}`)
    }

    if (args['--desktop-client']) {
      console.log(chalk.bold('\n  Desktop client:\n'))
      for (const addr of sortedURLs) {
        const searchParams = new URLSearchParams()
        searchParams.append('PREVIEW-MODE', addr)
        console.log(`    dcl://${searchParams.toString()}&`)
      }
    }

    console.log(chalk.bold('\n  Details:\n'))
    console.log(chalk.grey('\nPress CTRL+C to exit\n'))

    // Open preferably localhost/127.0.0.1
    if (openBrowser && sortedURLs.length && !args['--desktop-client']) {
      opn(sortedURLs[0]).catch(() => {
        console.log('Unable to open browser automatically.')
      })
    }
  })

  await dcl.preview()
}
