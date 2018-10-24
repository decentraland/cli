import {
  buildTypescript,
  installDependencies,
  isOnline,
  getOutdatedApi,
  isDeprecatedApiInstalled,
  formatOutdatedMessage
} from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { info, comment, loading, bold, error } from '../utils/logging'
import { ErrorType, fail } from '../utils/errors'
import { getOrElse } from '../utils'
import opn = require('opn')
import os = require('os')
import { isEnvCi } from '../utils/env'

export interface IArguments {
  options: {
    port?: number
    browser?: boolean
    ci?: boolean
    watch?: boolean
  }
}

export function start(vorpal: any) {
  vorpal
    .command('start')
    .option('-p, --port <number>', 'parcel previewer server port (default is 2044).')
    .option('--no-browser', 'prevents the CLI from opening a new browser window.')
    .option('--no-watch', 'prevents the CLI from watching filesystem changes.')
    .option('--ci', 'required to run the parcel previewer on a remote unix server')
    .description('Starts local development server.')
    .action(
      wrapCommand(async (args: IArguments) => {
        const isCi = getOrElse(args.options.ci, isEnvCi())

        const shouldWatchFiles = getOrElse(args.options.watch, true) && !isCi

        const dcl = new Decentraland({
          previewPort: args.options.port,
          watch: shouldWatchFiles
        })

        Analytics.preview()

        const hasDeprecatedMetaverseApi = await isDeprecatedApiInstalled()

        if (hasDeprecatedMetaverseApi) {
          fail(
            ErrorType.PREVIEW_ERROR,
            `\n\n\n\n  ❗️ You've installed a deprecated package 'metaverse-api'. Please run:\n\n  npm rm metaverse-api && npm install decentraland-api@latest\n\n  See more: https://docs.decentraland.org/releases/sdk/4.1.0/#migrate-a-scene-to-410\n`
          )
        }

        const sdkOutdated = await getOutdatedApi()

        if (sdkOutdated) {
          vorpal.log(bold(error(formatOutdatedMessage(sdkOutdated))))

          // TODO: would you like to install it? [Yn]
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

          const openBrowser = getOrElse(args.options.browser, true) && !isCi
          let url = null

          vorpal.log('') // line break

          info(`Preview server is now running`)

          vorpal.log(bold('\n  Available on:\n'))

          Object.keys(ifaces).forEach((dev, i) => {
            ifaces[dev].forEach(details => {
              if (details.family === 'IPv4') {
                const addr = `http://${details.address}:${port}`
                if (i === 0) {
                  url = addr
                }
                vorpal.log(`    ${addr}`)
              }
            })
          })

          vorpal.log(bold('\n  Details:\n'))

          vorpal.log(comment('\nPress CTRL+C to exit\n'))

          if (openBrowser) {
            opn(url)
          }
        })

        await dcl.preview()
      })
    )
}
