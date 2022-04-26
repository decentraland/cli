import inquirer, { ChoiceType, Questions } from 'inquirer'
import chalk from 'chalk'
import arg from 'arg'
import { sdk } from '@dcl/schemas'

import { Decentraland } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { warning } from '../utils/logging'
import { fail, ErrorType } from '../utils/errors'
import installDependencies from '../project/installDependencies'

import { isEmptyDirectory } from '../utils/filesystem'
import { ProjectType } from '@dcl/schemas/dist/sdk'
import * as spinner from '../utils/spinner'

import * as remoteScenesJSON from '../../samples/remote-scenes.json'
import { downloadRepoZip } from '../utils/download'

export const help = () => `
  Usage: ${chalk.bold('dcl init [options]')}

    ${chalk.dim('Options:')}

    -h, --help               Displays complete help
    -p, --project [type] Choose a projectType (default is scene). It could be any of ${chalk.bold(
      getProjectTypes()
    )}

    ${chalk.dim('Examples:')}

    - Generate a new Decentraland Scene project in my-project folder

    ${chalk.green('$ dcl init my-project')}

    - Generate a new scene project

    ${chalk.green('$ dcl init --project scene')}
`

function getProjectTypes() {
  return Object.values(sdk.ProjectType)
    .filter((a) => typeof a === 'string')
    .join(', ')
}

type InitOptionProjectType = {
  type: 'sdk.ProjectType'
  value: sdk.ProjectType
}

type InitOptionRepositoryURL = {
  type: 'repository.URL'
  value: string
}

type InitOption = InitOptionProjectType | InitOptionRepositoryURL

type RemoteRepositoriesFileSchema = {
  scenes: {
    title: string
    url: string
  }[]
}

async function getSceneInitOption(): Promise<InitOption> {
  const remoteRepositoriesFile =
    remoteScenesJSON as unknown as RemoteRepositoriesFileSchema
  const remoteChoices = remoteRepositoriesFile.scenes.map((repo, index) => ({
    name: `(${index + 1}) ${repo.title}`,
    value: repo.url
  }))

  const choices: ChoiceType[] = [
    ...remoteChoices,
    new inquirer.Separator(),
    {
      name: 'Paste a repository URL',
      value: 'write-repository'
    },
    new inquirer.Separator(),
    new inquirer.Separator()
  ]

  const projectTypeList: Questions = [
    {
      type: 'list',
      name: 'scene',
      message: 'Choose a scene',
      choices
    }
  ]

  const answers = await inquirer.prompt(projectTypeList)
  if (answers.scene === 'write-repository') {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Write the repository URL:'
      }
    ])
    return {
      type: 'repository.URL',
      value: answers.url
    }
  } else if (answers.scene) {
    const choice = remoteChoices.find((item) => item.value === answers.scene)
    if (choice) {
      return {
        type: 'repository.URL',
        value: answers.scene
      }
    }
  }

  fail(
    ErrorType.INIT_ERROR,
    `Couldn't get a valid scene-level choice. Try to select a valid one.`
  )
  return {} as any
}

async function getInitOption(type?: string): Promise<InitOption> {
  if (type) {
    if (!sdk.ProjectType.validate(type)) {
      fail(
        ErrorType.INIT_ERROR,
        `Invalid projectType: "${chalk.bold(
          type
        )}". Supported types are ${chalk.bold(getProjectTypes())}`
      )
    }

    return {
      type: 'sdk.ProjectType',
      value: type as sdk.ProjectType
    }
  }

  const firstChoices: ChoiceType[] = [
    {
      name: 'Scene',
      value: 'scene-option'
    },
    {
      name: 'Smart Item',
      value: sdk.ProjectType.SMART_ITEM
    },
    {
      name: 'Smart Wearable (Beta)',
      value: sdk.ProjectType.PORTABLE_EXPERIENCE
    },
    {
      name: 'Library',
      value: sdk.ProjectType.LIBRARY
    }
  ]

  const projectTypeList: Questions = [
    {
      type: 'list',
      name: 'project',
      message: 'Choose a project type',
      choices: firstChoices
    }
  ]
  const answers = await inquirer.prompt(projectTypeList)

  if (sdk.ProjectType.validate(answers.project)) {
    return {
      type: 'sdk.ProjectType',
      value: answers.project
    }
  }

  if (answers.project === 'scene-option') {
    return getSceneInitOption()
  }

  fail(
    ErrorType.INIT_ERROR,
    `Couldn't get a valid first-level choice. Try to select a valid one.`
  )
  return {} as any
}

export async function initProjectType(
  dcl: Decentraland,
  projectType: sdk.ProjectType
) {
  const project = dcl.workspace.getSingleProject()!

  if (projectType !== ProjectType.LIBRARY) {
    await project.writeDclIgnore()
    await project.writeSceneFile({})
  }

  await project.scaffoldProject(projectType)

  try {
    await installDependencies(dcl.getWorkingDir(), true)
  } catch (error: any) {
    fail(ErrorType.INIT_ERROR, error.message)
  }

  Analytics.sceneCreated({ projectType: projectType })

  if (projectType !== ProjectType.LIBRARY) {
    console.log(chalk.green(`\nSuccess! Run 'dcl start' to see your scene\n`))
  }
}

async function initRepository(dcl: Decentraland, url: string) {
  const project = dcl.workspace.getSingleProject()!

  try {
    spinner.create('Downloading example...')

    await downloadRepoZip(url, project.getProjectWorkingDir())

    spinner.succeed('Example downloaded')
  } catch (error: any) {
    spinner.fail(`Failed fetching the repo ${url}.`)
    fail(ErrorType.INIT_ERROR, error.message)
  }

  try {
    await installDependencies(dcl.getWorkingDir(), true)
  } catch (error: any) {
    fail(ErrorType.INIT_ERROR, error.message)
  }

  console.log(chalk.green(`\nSuccess! Run 'dcl start' to see your scene\n`))
  Analytics.sceneCreated({ projectType: 'scene-template', url })
}

export async function main() {
  const args = arg({
    '--help': Boolean,
    '--project': String,
    '-h': '--help',
    '-p': '--project'
  })
  const dcl = new Decentraland({ workingDir: process.cwd() })
  const project = dcl.workspace.getSingleProject()
  const isEmpty = await isEmptyDirectory(process.cwd())

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

  if (!project) {
    fail(ErrorType.INIT_ERROR, 'Cannot init a project in workspace directory')
    return
  }

  await project.validateNewProject()

  const choice = await getInitOption(args['--project'])

  if (choice.type === 'sdk.ProjectType') {
    await initProjectType(dcl, choice.value)
  } else if (choice.type === 'repository.URL') {
    await initRepository(dcl, choice.value)
  } else {
    fail(ErrorType.INIT_ERROR, 'Cannot get a choice')
  }
}
