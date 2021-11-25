import os from 'os'
import arg from 'arg'
import chalk from 'chalk'
import opn from 'opn'

import { Decentraland } from '../lib/Decentraland'
import {
  buildTypescript,
  checkECSVersions,
  getOutdatedApi,
  isOnline
} from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { error, formatOutdatedMessage } from '../utils/logging'
import { isEnvCi } from '../utils/env'
import * as spinner from '../utils/spinner'
import installDependencies from '../project/installDependencies'
import isECSInstalled from '../project/isECSInstalled'
import { getSceneFile } from '../sceneJson'
import { lintSceneFile } from '../sceneJson/lintSceneFile'
import updateBundleDependenciesField from '../project/updateBundleDependenciesField'
import { getProjectInfo } from '../project/projectInfo'
import { sdk } from '@dcl/schemas'
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
    '-c': '--ci'
  })

  const isCi = args['--ci'] || isEnvCi()
  const debug = !args['--no-debug'] && !isCi
  const openBrowser = !args['--no-browser'] && !isCi
  const watch = !args['--no-watch'] && !isCi
  const workingDir = process.cwd()
  const skipVersionCheck = args['--skip-version-checks']
  const projectInfo = getProjectInfo(workingDir)
  const enableWeb3 = args['--web3'] || projectInfo.sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE

  const dcl = new Decentraland({
    previewPort: parseInt(args['--port']!, 10),
    watch,
    workingDir
  })

  Analytics.preview()

  spinner.create('Checking if SDK is installed')
  const [sdkOutdated, online, ECSInstalled] = await Promise.all([
    getOutdatedApi(workingDir),
    isOnline(),
    isECSInstalled(workingDir)
  ])

  if (!ECSInstalled) {
    spinner.info('SDK not found. Installing dependencies...')
  } else if (sdkOutdated) {
    spinner.warn(
      `SDK is outdated, to upgrade to the latest version run the command: ${chalk.bold(
        'npm install decentraland-ecs@latest'
      )}`
    )
    console.log(chalk.bold(error(formatOutdatedMessage(sdkOutdated))))
  } else {
    spinner.succeed('Latest SDK installation found.')
  }

  if (online && !ECSInstalled) {
    await installDependencies(workingDir, false /* silent */)
  }

  if (!skipVersionCheck) {
    await checkECSVersions(dcl.getWorkingDir())
  }

  try {
    await updateBundleDependenciesField()
  } catch (err) {
    console.warn(`Unable to update bundle dependencies field.`, err)
  }

  if (await dcl.project.isTypescriptProject()) {
    await buildTypescript({ workingDir, watch: true, production: false })
  }

  await lintSceneFile(workingDir)
  const [x, y] = await getSceneBaseCoords()

  dcl.on('preview:ready', (port) => {
    const ifaces = os.networkInterfaces()

    let url = null

    console.log('') // line break

    console.log(`Preview server is now running`)

    console.log(chalk.bold('\n  Available on:\n'))

    Object.keys(ifaces).forEach((dev, i) => {
      ifaces[dev].forEach((details) => {
        if (details.family === 'IPv4') {
          let addr = `http://${details.address}:${port}?position=${x}%2C${y}`
          if (debug) {
            addr = `${addr}&SCENE_DEBUG_PANEL`
          }
          if (enableWeb3) {
            addr = `${addr}&ENABLE_WEB3`
          }
          if (i === 0) {
            url = addr
          }
          console.log(`    ${addr}`)
        }
      })
    })

    console.log(chalk.bold('\n  Details:\n'))

    console.log(chalk.grey('\nPress CTRL+C to exit\n'))

    if (openBrowser) {
      void opn(url).catch()
    }
  })

  await dcl.preview()
}

async function getSceneBaseCoords() {
  try {
    const sceneFile = await getSceneFile(process.cwd())
    return sceneFile.scene.base.replace(/\ /g, '').split(',')
  } catch (e) {
    console.log(error(`Could not open "scene.json" file`))
    throw e
  }
}
