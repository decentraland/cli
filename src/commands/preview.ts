import { buildTypescript } from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { Project } from '../lib/Project'
import { Preview } from '../lib/Preview'
import { Analytics } from '../utils/analytics'
const opn = require('opn')

export function start(vorpal: any) {
  vorpal
    .command('preview')
    .alias('start')
    .alias('serve')
    .option('-p, --port <number>', 'Parcel previewer server port (default is 2044).')
    .description('Starts local development server.')
    .action(
      wrapCommand(async function(args: any, callback: () => void) {
        return new Promise(async (resolve, reject) => {
          const project = new Project()
          const paths = await project.getAllFilePaths()

          if (paths.find(path => path.includes('tsconfig.json'))) {
            await buildTypescript()
          }

          await project.validateExistingProject()

          await Analytics.preview()
          startServer(vorpal, args)
        })
      })
    )
}

export function startServer(vorpal: any, args: any[]) {
  const preview = new Preview()
  const url = 'http://localhost:2044'
  vorpal.log(`Development server running at ${url}`)
  preview.startServer()
  opn(url)
}
