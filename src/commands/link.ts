import { wrapAsync } from '../utils/wrap-async'
import { LinkerAPI } from '../lib/LinkerAPI'
import { Project } from '../lib/Project'
import { success, notice } from '../utils/logging'
import opn = require('opn')
import { sceneLink, sceneLinkSuccess } from '../utils/analytics'
import { Ethereum } from '../lib/Ethereum'

export function link(vorpal: any) {
  vorpal
    .command('link')
    .description('Link scene to Ethereum.')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        return new Promise(async (resolve, reject) => {
          const project = new Project()
          const ethereum = new Ethereum()
          await project.validateExistingProject()

          const projectFile = await project.getProjectFile()
          const sceneFile = await project.getSceneFile()
          const landContract = await ethereum.getLandContract()
          const linker = new LinkerAPI(sceneFile, projectFile, landContract)

          linker.on('linker_app_ready', async (url: string) => {
            await sceneLink()
            vorpal.log(notice('Linking app ready.'))
            vorpal.log(`Please proceed to ${url}`)
            opn(url)
          })

          linker.on('link_success', async () => {
            await sceneLinkSuccess()
            vorpal.log(success('\nProject successfully linked to the blockchain'))
            resolve()
          })

          try {
            await linker.link()
          } catch (e) {
            reject(e)
          }
        })
      })
    )
}
