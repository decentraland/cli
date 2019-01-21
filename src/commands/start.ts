import * as os from 'os'
import * as arg from 'arg'
import chalk from 'chalk'
import opn = require('opn')

import { Decentraland } from '../lib/Decentraland'
import {
  buildTypescript,
  installDependencies,
  isOnline,
  getOutdatedApi
} from '../utils/moduleHelpers'
import { Analytics } from '../utils/analytics'
import { info, loading, error, formatOutdatedMessage } from '../utils/logging'
import { ErrorType } from '../utils/errors'
import { isEnvCi } from '../utils/env'

export const help = () => `
  Usage: ${chalk.bold('dcl start [path] [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -p, --port        [port]  Select a custom port for the development server
      -b, --no-browser          Do not open a new browser window
      -w, --no-watch            Do not open watch for filesystem changes
      -c, --ci                  Run the parcel previewer on a remote unix server

    ${chalk.dim('Examples:')}

    - Start a local development server for a Decentraland Scene on my-project

      ${chalk.green('$ dcl start my-project')}

    - Start a local development server for a Decentraland Scene at a docker container

      ${chalk.green('$ dcl start --ci')}
`

export async function main() {
  const args = arg({
    '--help': Boolean,
    '--port': String,
    '--no-browser': Boolean,
    '--no-watch': Boolean,
    '--ci': Boolean,
    '-h': '--help',
    '-p': '--port',
    '-b': '--no-browser',
    '-w': '--no-watch',
    '-c': '--ci'
  })

  const isCi = args['--ci'] || isEnvCi()

  const shouldWatchFiles = !args['--no-watch'] && !isCi

  const dcl = new Decentraland({
    previewPort: parseInt(args['--port'], 10),
    watch: shouldWatchFiles,
    workingDir: args._[2]
  })

  Analytics.preview()

  const sdkOutdated = await getOutdatedApi()

  if (sdkOutdated) {
    console.log(chalk.bold(error(formatOutdatedMessage(sdkOutdated))))
  }

  if (await dcl.project.needsDependencies()) {
    if (await isOnline()) {
      const spinner = loading('Installing dependencies')
      await installDependencies(true)
      spinner.succeed()
    } else {
      const e = new Error('Unable to install dependencies: no internet connection')
      e.name = ErrorType.PREVIEW_ERROR
      throw e
    }
  }

  if (await dcl.project.isTypescriptProject()) {
    await buildTypescript()
  }

  dcl.on('preview:ready', port => {
    const ifaces = os.networkInterfaces()

    const openBrowser = !args['--no-browser'] && !isCi
    let url = null

    console.log('') // line break

    info(`Preview server is now running`)

    console.log(chalk.bold('\n  Available on:\n'))

    Object.keys(ifaces).forEach((dev, i) => {
      ifaces[dev].forEach(details => {
        if (details.family === 'IPv4') {
          const addr = `http://${details.address}:${port}`
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
    }
  })

  await dcl.preview()
}
