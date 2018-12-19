import * as arg from 'arg'
import * as inquirer from 'inquirer'
import chalk from 'chalk'

import { BoilerplateType } from '../lib/Project'
import { Decentraland } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { warning, loading } from '../utils/logging'
import { installDependencies, isOnline } from '../utils/moduleHelpers'
import { fail, ErrorType } from '../utils/errors'

export const help = () => `
  Usage: ${chalk.bold('dcl init [path] [options]')}

    ${chalk.dim('Options:')}

      -h, --help               Displays complete help
      -b, --boilerplate [type] Choose a boilerplate (default is ecs). It could be any of ${chalk.bold(getBoilerplateTypes())}

    ${chalk.dim('Examples:')}

    - Generate a new Decentraland Scene project in my-project folder

      ${chalk.green('$ dcl init my-project')}

    - Generate a new static project

      ${chalk.green('$ dcl info --boilerplate static')}
`

function getBoilerplateTypes() {
  return Object.values(BoilerplateType)
    .filter($ => isNaN($ as any))
    .join(', ')
}

export async function main() {
  const args = arg({
    '--help': Boolean,
    '--boilerplate': String,
    '-h': '--help',
    '-b': '--boilerplate'
  })

  const boilerplate = args['--boilerplate'] || BoilerplateType.ECS

  if (!Object.values(BoilerplateType).includes(boilerplate)) {
    fail(
      ErrorType.INIT_ERROR,
      `Invalid boilerplate: "${chalk.bold(boilerplate)}". Supported types are ${chalk.bold(getBoilerplateTypes())}`
    )
  }

  const dcl = new Decentraland({
    workingDir: args._[2]
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
      return
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

  await dcl.init(sceneMeta as DCL.SceneMetadata, boilerplate as BoilerplateType)

  if (await dcl.project.needsDependencies()) {
    if (await isOnline()) {
      const spinner = loading('Installing dependencies')
      await installDependencies(true)
      spinner.succeed('Dependencies installed')
    } else {
      fail(ErrorType.PREVIEW_ERROR, 'Unable to install dependencies: no internet connection')
    }
  }

  Analytics.sceneCreated({ boilerplateType: boilerplate })

  console.log(chalk.green(`\nSuccess! Run 'dcl start' to see your scene\n`))
}
