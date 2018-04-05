import { buildTypescript } from '../utils/module-helpers'
import { wrapAsync } from '../utils/wrap-async'
import { Project } from '../lib/Project'
import { Preview } from '../lib/Preview'
import { preview } from '../utils/analytics'
const opn = require('opn')

export function start(vorpal: any) {
  vorpal
    .command('preview')
    .alias('start')
    .alias('serve')
    .description('Starts local development server.')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        return new Promise(async (resolve, reject) => {
          const project = new Project()
          await project.validateExistingProject()
          const paths = await project.getAllFilePaths()

          if (paths.find(path => path.includes('tsconfig.json'))) {
            await buildTypescript()
          }

          await preview()
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
