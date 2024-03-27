import inquirer, { QuestionCollection } from 'inquirer'
import repositories from './repositories'
import { ErrorType, fail } from '../../utils/errors'
import { InitOption } from './types'

export async function sceneOptions(): Promise<InitOption> {
  const sceneChoices = [
    ...repositories.scenes.map((repo, index) => ({
      name: `(${index + 1}) ${repo.title}`,
      value: repo.url
    })),
    {
      name: 'Paste a repository URL',
      value: 'write-repository'
    }
  ]

  const projectTypeList: QuestionCollection = [
    {
      type: 'list',
      name: 'scene',
      message: 'Choose a scene',
      choices: sceneChoices
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
      type: 'scene',
      value: answers.url
    }
  } else if (answers.scene) {
    const choice = sceneChoices.find((item) => item.value === answers.scene)
    if (choice) {
      return {
        type: 'scene',
        value: answers.scene
      }
    }
  }

  fail(ErrorType.INIT_ERROR, `Couldn't get a valid scene-level choice. Try to select a valid one.`)
  return {} as any
}
