import inquirer = require('inquirer')
import { wrapCommand } from '../utils/wrapCommand'
import { installDependencies, isOnline } from '../utils/moduleHelpers'
import { BoilerplateType } from '../lib/Project'
import { Analytics } from '../utils/analytics'
import { success, notice, comment, highlight } from '../utils/logging'
import { Decentraland } from '../lib/Decentraland'
import { fail, ErrorType } from '../utils/errors'
import { parseCoordinates, validateCoordinates } from '../utils/coordinateHelpers'

export function init(vorpal: any) {
  vorpal
    .command('init')
    .description('Generates new Decentraland scene.')
    .option('-p, --path <path>', 'Output path (default is the current working directory).')
    .option('--boilerplate', 'static, singleplayer or multiplayer')
    .action(
      wrapCommand(async function(args: any, callback: () => void) {
        const dcl = new Decentraland({
          workingDir: args.options.path
        })

        await dcl.project.validateNewProject()

        const sceneMeta = await inquirer.prompt([
          {
            type: 'input',
            name: 'display.title',
            message: notice('Scene title: \n'),
            default: dcl.project.getRandomName()
          },
          {
            type: 'input',
            name: 'owner',
            message: `${notice('Your ethereum address: ')}\n${comment(
              '(optional, recommended -- used to check ownership of parcels when deploying your scene)'
            )}\n`
          },
          {
            type: 'input',
            name: 'contact.name',
            message: `${notice('Your name: ')}\n${comment('(optional -- shown to other users so that they can contact you)')}\n`
          },
          {
            type: 'input',
            name: 'contact.email',
            message: `${notice('Your email: ')}\n${comment('(optional -- shown to other users so that they can contact you)')}\n`
          },
          {
            type: 'input',
            name: 'scene.parcels',
            message: `${notice('Parcels comprising the scene')}\n${comment(
              '(optional, recommended -- used to show the limts of your scene and upload to these coordinates)\nPlease use this format: `x,y; x,y; x,y ...`'
            )}\n`,
            validate: validateCoordinates as any
          }
        ])

        sceneMeta.communications = {
          type: 'webrtc',
          signalling: 'https://rendezvous.decentraland.org'
        }

        sceneMeta.policy = {
          fly: true,
          voiceEnabled: true,
          blacklist: [],
          teleportPosition: '0,0,0'
        }

        sceneMeta.scene.parcels = sceneMeta.scene.parcels ? parseCoordinates(sceneMeta.scene.parcels) : ['0,0']

        sceneMeta.main = 'scene.xml' // replaced by chosen template
        sceneMeta.scene.base = sceneMeta.scene.parcels[0]

        let boilerplateType = args.options.boilerplate
        let websocketServer: string

        if (args.options.boilerplate === undefined) {
          const results = await inquirer.prompt({
            type: 'list',
            name: 'archetype',
            message: highlight('Which type of project would you like to generate?'),
            choices: [
              { name: 'Static scene project', value: BoilerplateType.STATIC },
              { name: 'Dynamic scene (single player)', value: BoilerplateType.TYPESCRIPT },
              { name: 'Dynamic multiplayer scene (EXPERIMENTAL)', value: BoilerplateType.WEBSOCKETS }
            ],
            default: BoilerplateType.STATIC
          })

          boilerplateType = results.archetype

          if (results.archetype === BoilerplateType.WEBSOCKETS) {
            const ws = await inquirer.prompt({
              type: 'input',
              name: 'server',
              message: `${notice('Your websocket server')}`,
              default: 'ws://localhost:8087'
            })

            websocketServer = ws.server
          }
        }

        await dcl.init(sceneMeta as DCL.SceneMetadata, boilerplateType, websocketServer)

        if (await dcl.project.needsDependencies()) {
          if (await isOnline()) {
            vorpal.log('Installing dependencies...')
            await installDependencies()
          } else {
            fail(ErrorType.PREVIEW_ERROR, 'Unable to install dependencies: no internet connection')
          }
        }

        await Analytics.sceneCreated({ boilerplateType })

        vorpal.log(success(`\nSuccess! Run 'dcl preview' to see your scene`))
      })
    )
}
