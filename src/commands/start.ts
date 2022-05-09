import os from 'os'
import arg from 'arg'
import chalk from 'chalk'
import opn from 'opn'

import { Decentraland } from '../lib/Decentraland'
import {
  buildTypescript,
  checkECSAndCLIVersions,
  getOutdatedApi,
  isECSVersionLower,
  isOnline
} from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { error, formatOutdatedMessage } from '../utils/logging'
import { isEnvCi } from '../utils/env'
import * as spinner from '../utils/spinner'
import installDependencies from '../project/installDependencies'
import isECSInstalled from '../project/isECSInstalled'
import { lintSceneFile } from '../sceneJson/lintSceneFile'
import updateBundleDependenciesField from '../project/updateBundleDependenciesField'

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
    '--web3': Boolean,
    '-h': '--help',
    '-p': '--port',
    '-d': '--no-debug',
    '-b': '--no-browser',
    '-w': '--no-watch',
    '-c': '--ci',
    '--skip-build': Boolean,
    '--desktop-client': Boolean
  })

  const isCi = args['--ci'] || isEnvCi()
  const debug = !args['--no-debug'] && !isCi
  const openBrowser = !args['--no-browser'] && !isCi
  const skipBuild = args['--skip-build']
  const watch = !args['--no-watch'] && !isCi && !skipBuild
  const workingDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']

  const dcl = new Decentraland({
    previewPort: parseInt(args['--port']!, 10),
    watch,
    workingDir
  })

  const enableWeb3 = args['--web3']

  Analytics.preview()

  const online = await isOnline()

  for (const project of dcl.workspace.getAllProjects()) {
    if (!skipBuild) {
      spinner.create(`Checking if SDK is installed in project`)

      const [sdkOutdated, ECSInstalled] = await Promise.all([
        getOutdatedApi(project.getProjectWorkingDir()),
        isECSInstalled(project.getProjectWorkingDir())
      ])

      if (!ECSInstalled) {
        spinner.info('SDK not found. Installing dependencies...')
      } else if (sdkOutdated) {
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

      if (online && !ECSInstalled) {
        await installDependencies(
          project.getProjectWorkingDir(),
          false /* silent */
        )
      }

      if (!skipVersionCheck) {
        await checkECSAndCLIVersions(project.getProjectWorkingDir())
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

  const baseCoords = await dcl.workspace.getBaseCoords()
  const hasPortableExperience = dcl.workspace.hasPortableExperience()

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
    if (openBrowser && sortedURLs.length) {
      void opn(sortedURLs[0]).catch()
    }
  })

  await dcl.preview()
}
