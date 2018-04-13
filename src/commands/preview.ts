import { buildTypescript, installDependencies } from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { Analytics } from '../utils/analytics'
import { Decentraland } from '../lib/Decentraland'
import { success, highlight } from '../utils/logging'
import { readJSON } from '../utils/filesystem'
import * as path from 'path'
import * as latestVersion from 'latest-version'
import * as semver from 'semver'
import { getRootPath, getNodeModulesPath } from '../utils/project'
const opn = require('opn')

export interface IPreviewArguments {
  options: {
    port?: number
  }
}

export function start(vorpal: any) {
  vorpal
    .command('preview')
    .alias('start')
    .alias('serve')
    .option('-p, --port <number>', 'Parcel previewer server port (default is 2044).')
    .description('Starts local development server.')
    .action(
      wrapCommand(async function(args: IPreviewArguments, callback: () => void) {
        return new Promise(async (resolve, reject) => {
          const metaverseApiVersionLatest = await latestVersion('metaverse-api')
          const metaverseApiPkg = await readJSON<{ version: number }>(
            path.resolve(getNodeModulesPath(getRootPath()), 'metaverse-api', 'package.json')
          )

          const dcl = new Decentraland({
            previewPort: args.options.port
          })

          await Analytics.preview()

          dcl.on('preview:ready', url => {
            vorpal.log(success(`Development server running at ${url}`))
            opn(url)
          })

          if (semver.lt(metaverseApiPkg.version, metaverseApiVersionLatest)) {
            vorpal.log(highlight('WARNING: outdated metaverse-api version, please run npm update'))
          }

          if (await dcl.project.needsDependencies()) {
            vorpal.log('Installing dependencies...')
            await installDependencies()
          }

          if (await dcl.project.isTypescriptProject()) {
            await buildTypescript()
          }

          await dcl.preview()
        })
      })
    )
}
