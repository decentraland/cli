import inquirer = require('inquirer')
import { wrapCommand } from '../utils/wrapCommand'
import { installDependencies } from '../utils/moduleHelpers'
import { getRootPath } from '../utils/project'
import { BoilerplateType, Project } from '../lib/Project'
import { Analytics } from '../utils/analytics'
import { success, notice, comment, highlight } from '../utils/logging'

export function init(vorpal: any) {
  vorpal
    .command('init')
    .description('Generates new Decentraland scene.')
    .option('-p, --path <path>', 'Output path (default is the current working directory).')
    .option('--boilerplate', 'Include sample scene.')
    .action(
      wrapCommand(async function(args: any, callback: () => void) {
        const dirName = args.options.path || getRootPath()
        const project = new Project()

        await project.validateNewProject()

        const sceneMeta = await inquirer.prompt([
          {
            type: 'input',
            name: 'display.title',
            message: notice('Scene title: \n'),
            default: project.getRandomName()
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
            )}\n`
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

        sceneMeta.scene.parcels = sceneMeta.scene.parcels
          ? sceneMeta.scene.parcels.split(';').map((coord: string) => coord.replace(/\s/g, ''))
          : ['0,0']

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
              default: 'ws://localhost:3000'
            })

            websocketServer = ws.server
          }
        }

        await project.writeDclIgnore(dirName)
        await project.initProject(dirName)
        await project.writeSceneFile(dirName, sceneMeta as any)
        await project.scaffoldProject(boilerplateType, websocketServer)

        if (await project.hasDependencies()) {
          vorpal.log('Installing dependencies...')
          await installDependencies()
        }

        await Analytics.sceneCreated()

        vorpal.log(success(`\nSuccess! Run 'dcl preview' to see your scene`))
      })
    )
}
