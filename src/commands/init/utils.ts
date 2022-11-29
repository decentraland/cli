import { sdk } from '@dcl/schemas'
import inquirer, { QuestionCollection } from 'inquirer'
import chalk from 'chalk'

import { ErrorType, fail } from '../../utils/errors'
import repositories from './repositories'
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
  if (choice.value === sdk.ProjectType.SCENE) {
    return repositories.scenes[0].url
  }

  if (choice.value === sdk.ProjectType.LIBRARY) {
    return repositories.library
  }

  if (choice.value === sdk.ProjectType.SMART_ITEM) {
    return repositories.smartItem
  }

  if (choice.value === sdk.ProjectType.PORTABLE_EXPERIENCE) {
    return repositories.portableExperience
  }

  if (choice.type === 'scene') {
    return choice.value
  }
}

export function isValidTemplateUrl(url: string) {
  return /^https:\/\/github\.com\/decentraland(-scenes)?\/(.)+/.test(url)
}
