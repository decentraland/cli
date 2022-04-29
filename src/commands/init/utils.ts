import { sdk } from '@dcl/schemas'
import inquirer, { QuestionCollection } from 'inquirer'
import chalk from 'chalk'

import repositoriesJson from '../../../samples/remote-scenes.json'
import { ErrorType, fail } from '../../utils/errors'
import { sceneOptions } from './scene'
import { InitOption } from './types'

export function getProjectTypes() {
  return Object.values(sdk.ProjectType)
    .filter((a) => typeof a === 'string')
    .join(', ')
}

export async function getInitOption(type?: string): Promise<InitOption> {
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
      type: 'project',
      value: type as sdk.ProjectType
    }
  }

  const projectTypeList: QuestionCollection = [
    {
      type: 'list',
      name: 'project',
      message: 'Choose a project type',
      choices: [
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
    }
  ]
  const answers = await inquirer.prompt(projectTypeList)

  if (answers.project === 'scene-option') {
    return sceneOptions()
  }

  if (sdk.ProjectType.validate(answers.project)) {
    return {
      type: 'project',
      value: answers.project
    }
  }

  fail(
    ErrorType.INIT_ERROR,
    `Couldn't get a valid first-level choice. Try to select a valid one.`
  )
  return {} as any
}

export function getRepositoryUrl(choice: InitOption): string | void {
  if (choice.type === 'scene') {
    return choice.value
  }

  if (choice.value === sdk.ProjectType.LIBRARY) {
    return repositoriesJson.library
  }

  if (choice.value === sdk.ProjectType.SMART_ITEM) {
    return repositoriesJson.library
  }

  if (choice.value === sdk.ProjectType.PORTABLE_EXPERIENCE) {
    return repositoriesJson.library
  }
}
