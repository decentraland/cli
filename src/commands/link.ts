import { wrapAsync } from '../utils/wrap-async'
import { LinkerAPI } from '../lib/LinkerAPI'
import { Project } from '../lib/Project'
import { notice } from '../utils/logging'
import opn = require('opn')
import { sceneLink, sceneLinkSuccess } from '../utils/analytics'
import { Ethereum } from '../lib/Ethereum'

export function command(vorpal: any) {
  vorpal
    .command('link')
    .description('Link scene to Ethereum.')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        const project = new Project()
        await project.validateExistingProject()
        return link(vorpal, project)
      })
    )
}

export function link(vorpal: any, project: Project) {
  return new Promise(async (resolve, reject) => {
    const projectFile = await project.getProjectFile()
    const sceneFile = await project.getSceneFile()
    const landContract = await Ethereum.getLandContractAddress()
    const linker = new LinkerAPI(sceneFile, projectFile, landContract)

    linker.on('linker_app_ready', async (url: string) => {
      await sceneLink()
      vorpal.log(notice('Linking app ready.'))
      vorpal.log(`Please proceed to ${url}`)
      opn(url)
    })

    linker.on('link_success', async () => {
      await sceneLinkSuccess()
      vorpal.log('Project successfully linked to the blockchain')
      resolve()
    })

    try {
      await linker.link()
    } catch (e) {}
  })
}
