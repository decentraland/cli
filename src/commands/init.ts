import inquirer, { Questions } from 'inquirer'
import chalk from 'chalk'
import arg from 'arg'

import { BoilerplateType } from '../lib/Project'
import { Decentraland } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { warning } from '../utils/logging'
import { fail, ErrorType } from '../utils/errors'
import installDependencies from '../project/installDependencies'

export const help = () => `
Usage: ${chalk.bold('dcl init [options]')}

${chalk.dim('Options:')}

-h, --help               Displays complete help
-b, --boilerplate [type] Choose a boilerplate (default is ecs). It could be any of ${chalk.bold(
  getBoilerplateTypes()
)}

  ${chalk.dim('Examples:')}

  - Generate a new Decentraland Scene project in my-project folder

  ${chalk.green('$ dcl init my-project')}

  - Generate a new ecs project

  ${chalk.green('$ dcl init --boilerplate ecs')}
`

function getBoilerplateTypes() {
  return Object.values(BoilerplateType)
    .filter(($) => isNaN($ as any))
    .join(', ')
}

async function getBoilerplate(type?: string): Promise<BoilerplateType> {
  if (!type) {
    const boilerplateList: Questions = [
      {
        type: 'list',
        name: 'boilerplate',
        message: 'Choose a boilerplate',
        choices: [
          { value: BoilerplateType.ECS, name: 'ECS' },
          { value: BoilerplateType.SMART_ITEM, name: 'Smart Item' },
          {
            value: BoilerplateType.PORTABLE_EXPERIENCE,
            name: 'Portable Experience'
          }
        ]
      }
    ]
    const answers = await inquirer.prompt(boilerplateList)
    const boilerplate: BoilerplateType = answers.boilerplate

    return boilerplate
  }

  if (!Object.values(BoilerplateType).includes(type as BoilerplateType)) {
    fail(
      ErrorType.INIT_ERROR,
      `Invalid boilerplate: "${chalk.bold(
        type
      )}". Supported types are ${chalk.bold(getBoilerplateTypes())}`
    )
  }
  return type as BoilerplateType
}

export async function main() {
  const args = arg({
    '--help': Boolean,
    '--boilerplate': String,
    '-h': '--help',
    '-b': '--boilerplate'
  })

  const boilerplate = await getBoilerplate(args['--boilerplate'])
  const dcl = new Decentraland({ workingDir: process.cwd() })

  await dcl.project.validateNewProject()
  const isEmpty = await dcl.project.isProjectDirEmpty()

  if (!isEmpty) {
    const results = await inquirer.prompt({
      type: 'confirm',
      name: 'continue',
      message: warning(
        `Project directory isn't empty. Do you want to continue?`
      )
    })

    if (!results.continue) {
      return
    }
  }

  await dcl.init(boilerplate)

  try {
    await installDependencies(dcl.getWorkingDir(), false)
  } catch (error: any) {
    fail(ErrorType.INIT_ERROR, error.message)
  }

  Analytics.sceneCreated({ boilerplateType: boilerplate })

  console.log(chalk.green(`\nSuccess! Run 'dcl start' to see your scene\n`))
}
