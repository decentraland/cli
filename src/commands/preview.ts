import { buildTypescript, installDependencies, isOnline, getInstalledVersion, isMetaverseApiOutdated } from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { info, comment, loading, bold } from '../utils/logging'
import { ErrorType } from '../utils/errors'
import opn = require('opn')
import os = require('os')

export interface IArguments {
  options: {
    port?: number
    browser?: boolean
  }
}

export function start(vorpal: any) {
  vorpal
    .command('preview')
    .alias('start')
    .option('-p, --port <number>', 'parcel previewer server port (default is 2044).')
    .option('--no-browser', 'prevents the CLI from opening a new browser window.')
    .description('Starts local development server.')
    .action(
      wrapCommand(async (args: IArguments) => {
        return new Promise(async (resolve, reject) => {
          const dcl = new Decentraland({
            previewPort: args.options.port
          })

          await Analytics.preview()

          dcl.on('preview:ready', async port => {
            const ifaces = os.networkInterfaces()
            const sdkOutdated = await isMetaverseApiOutdated()
            const openBrowser = args.options.browser !== undefined ? args.options.browser : true
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

            vorpal.log(`    metaverse-api version: ${await getInstalledVersion('metaverse-api')}`, sdkOutdated ? '(OUTDATED)' : '')

            vorpal.log(comment('\nPress CTRL+C to exit\n'))

            if (openBrowser) {
              opn(url)
            }
          })

          if (await dcl.project.needsDependencies()) {
            if (await isOnline()) {
              const spinner = loading('Installing dependencies')
              await installDependencies(true)
              spinner.succeed()
            } else {
              const e = new Error('Unable to install dependencies: no internet connection')
              e.name = ErrorType.PREVIEW_ERROR
              reject(e)
            }
          }

          if (await dcl.project.isTypescriptProject()) {
            await buildTypescript()
          }

          await dcl.preview()
        })
      })
    )
}
