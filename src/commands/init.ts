import * as inquirer from 'inquirer'

import { BoilerplateType } from '../lib/Project'
import { Decentraland } from '../lib/Decentraland'
import { getOrElse } from '../utils'
import { Analytics } from '../utils/analytics'
import { warning, loading, positive, bold } from '../utils/logging'
import { wrapCommand } from '../utils/wrapCommand'
import { installDependencies, isOnline } from '../utils/moduleHelpers'
import { fail, ErrorType } from '../utils/errors'

export function init(vorpal: any) {
  vorpal
    .command('init')
    .description('Generates new Decentraland scene.')
    .option('--path <path>', 'output path (default is the current working directory).')
    .option(
      '--boilerplate <type>',
      Object.values(BoilerplateType)
        .filter(isNaN as any)
        .join(', ')
    )
    .action(
      wrapCommand(async (args: any) => {
        if (args.options.boilerplate === true) {
          fail(
            ErrorType.PROJECT_ERROR,
            `dcl init --boilerplate <type>\n<type> is missing, supported types are ${Object.values(BoilerplateType)
              .filter($ => isNaN($ as any))
              .join(', ')}`
          )
        }

        const boilerplateType = getOrElse(args.options.boilerplate, BoilerplateType.TYPESCRIPT_STATIC)

        if (!Object.values(BoilerplateType).includes(boilerplateType)) {
          fail(
            ErrorType.PROJECT_ERROR,
            `Invalid boilerplate type: '${boilerplateType}'. Supported types are ${Object.values(BoilerplateType)
              .filter($ => isNaN($ as any))
              .join(', ')}`
          )
        }

        const dcl = new Decentraland({
          workingDir: args.options.path
        })

        await dcl.project.validateNewProject()
        const isEmpty = await dcl.project.isProjectDirEmpty()

        if (!isEmpty) {
          const results = await inquirer.prompt({
            type: 'confirm',
            name: 'continue',
            message: warning(`Project directory isn't empty. Do you want to continue?`)
          })

          if (!results.continue) {
            process.exit(0)
          }
        }

        const sceneMeta = {
          display: { title: dcl.project.getRandomName() },
          contact: {
            name: '',
            email: ''
          },
          owner: '',
          scene: {
            parcels: ['0,0'],
            base: '0,0'
          },
          communications: {
            type: 'webrtc',
            signalling: 'https://rendezvous.decentraland.org'
          },
          policy: {
            fly: true,
            voiceEnabled: true,
            blacklist: [],
            teleportPosition: '0,0,0'
          },
          main: 'scene.xml'
        }

        let websocketServer: string

        if (boilerplateType === BoilerplateType.WEBSOCKETS) {
          const ws = await inquirer.prompt({
            type: 'input',
            name: 'server',
            message: `Your websocket server`,
            default: 'ws://localhost:8087'
          })

          websocketServer = ws.server
        }

        await dcl.init(sceneMeta as DCL.SceneMetadata, boilerplateType, websocketServer)

        if (await dcl.project.needsDependencies()) {
          if (await isOnline()) {
            const spinner = loading('Installing dependencies')
            await installDependencies(true)
            spinner.succeed('Dependencies installed')
          } else {
            fail(ErrorType.PREVIEW_ERROR, 'Unable to install dependencies: no internet connection')
          }
        }

        Analytics.sceneCreated({ boilerplateType })

        vorpal.log(positive(`\nSuccess! Run 'dcl start' to see your scene\n`))
        vorpal.log(bold(`Edit "parcels" property at scene.json to make your scene fit your estate.`))
      })
    )
}
