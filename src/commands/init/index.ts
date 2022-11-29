import chalk from 'chalk'

import { Decentraland } from '../../lib/Decentraland'
import installDependencies from '../../project/installDependencies'
import { Analytics } from '../../utils/analytics'
import { downloadRepoZip } from '../../utils/download'
import { fail, ErrorType } from '../../utils/errors'
import { isEmptyDirectory } from '../../utils/filesystem'
import * as spinner from '../../utils/spinner'
import { getInitOption, getRepositoryUrl, isValidTemplateUrl } from './utils'
import { args } from './help'
import { InitOption } from './types'

export { help } from './help'

export async function main() {
  const dcl = new Decentraland({ workingDir: process.cwd() })
  const project = dcl.workspace.getSingleProject()
  const isEmpty = await isEmptyDirectory(process.cwd())
  if (!isEmpty) {
    fail(ErrorType.INIT_ERROR, `Project directory isn't empty`)
    return
  }

  if (!project) {
    fail(ErrorType.INIT_ERROR, 'Cannot init a project in workspace directory')
    return
  }
  const projectArg = args['--project']
  const templateArg = args['--template']

  let url: string | void
  let choice: InitOption | void
  if (templateArg && isValidTemplateUrl(templateArg)) {
    choice = {
      type: 'scene',
      value: templateArg
    }
    url = templateArg
  } else {
    choice = await getInitOption(projectArg)
    url = getRepositoryUrl(choice)
  }

  if (!url) {
    fail(ErrorType.INIT_ERROR, 'Cannot get a choice')
    return
  }

  const type = choice.type === 'scene' ? 'scene-template' : choice.value

  try {
    spinner.create('Downloading example...')

    await downloadRepoZip(url, project.getProjectWorkingDir())

    spinner.succeed('Example downloaded')
  } catch (error: any) {
    spinner.fail(`Failed fetching the repo ${url}.`)
    fail(ErrorType.INIT_ERROR, error.message)
  }

  const skipInstall = args['--skip-install']

  if (!skipInstall) {
    try {
      await installDependencies(dcl.getWorkingDir(), true)
    } catch (error: any) {
      fail(ErrorType.INIT_ERROR, error.message)
    }
  }

  console.log(chalk.green(`\nSuccess! Run 'dcl start' to see your scene\n`))
  Analytics.sceneCreated({ projectType: type, url })
}
