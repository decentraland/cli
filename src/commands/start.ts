import * as os from 'os'
import * as arg from 'arg'
import chalk from 'chalk'
import opn = require('opn')

import { Decentraland } from '../lib/Decentraland'
import { buildTypescript, getOutdatedApi, isOnline } from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { error, formatOutdatedMessage } from '../utils/logging'
import { isEnvCi } from '../utils/env'
import * as spinner from '../utils/spinner'
import installDependencies from '../project/installDependencies'
import isECSInstalled from '../project/isECSInstalled'
import { getSceneFile } from '../sceneJson'
import { lintSceneFile } from '../sceneJson/lintSceneFile'

export const help = () => `
  Usage: ${chalk.bold('dcl start [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -d, --no-debug            Disable debugging panel
      -b, --no-browser          Do not open a new browser window
      -w, --no-watch            Do not open watch for filesystem changes
      -c, --ci                  Run the parcel previewer on a remote unix server

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

  const dcl = new Decentraland({
    previewPort: parseInt(args['--port'], 10),
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
    await installDependencies(workingDir, !process.env.DEBUG)
  }

  if (await dcl.project.isTypescriptProject()) {
    await buildTypescript(workingDir, false, true)
  }

  await lintSceneFile(workingDir)
  const [x, y] = await getSceneBaseCoords()

  dcl.on('preview:ready', port => {
    const ifaces = os.networkInterfaces()

    let url = null

    console.log('') // line break

    console.log(`Preview server is now running`)

    console.log(chalk.bold('\n  Available on:\n'))

    Object.keys(ifaces).forEach((dev, i) => {
      ifaces[dev].forEach(details => {
        if (details.family === 'IPv4') {
          let addr = `http://${details.address}:${port}?position=${x}%2C${y}`
          if (debug) {
            addr = `${addr}&SCENE_DEBUG_PANEL`
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
      opn(url)
        .then()
        .catch()
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
