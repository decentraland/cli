import chalk from 'chalk'

import { Analytics } from '../utils/analytics'
import { warning } from '../utils/logging'
import { fail, ErrorType } from '../utils/errors'

import { createWorkspace, initializeWorkspace } from '../lib/Workspace'

export const help = () => `
  Usage: ${chalk.bold('dcl workspace SUBCOMMAND [options]')}
  
  ${chalk.dim('Sub commands:')}
    
    init             Create a workspace looking for subfolder Decentraland projects.
    ls               List all projects in the current workspace
    add              Add a project in the current workspace.

  ${chalk.dim('Options:')}

    -h, --help               Displays complete help
`

async function init() {
  try {
    await initializeWorkspace(process.cwd())
    console.log(chalk.green(`\nSuccess! Run 'dcl start' to preview your workspace.\n`))
  } catch (err: any) {
    fail(ErrorType.WORKSPACE_ERROR, err.message)
  }

  Analytics.sceneCreated({ projectType: 'workspace' })
}

async function listProjects() {
  const workingDir = process.cwd()
  const workspace = createWorkspace({ workingDir })

  if (workspace.isSingleProject()) {
    fail(ErrorType.WORKSPACE_ERROR, `There is no a workspace in the current directory.`)
  }

  console.log(`\nWorkspace in folder ${workingDir}`)
  for (const [index, project] of workspace.getAllProjects().entries()) {
    const projectPath = project.getProjectWorkingDir().replace(`${workingDir}\\`, '').replace(`${workingDir}/`, '')
    console.log(`> Project ${index + 1} in: ${projectPath}`)
  }
  console.log('')
}

async function addProject() {
  if (process.argv.length <= 4) {
    fail(ErrorType.WORKSPACE_ERROR, `Missing folder of new project.`)
  }

  const newProjectPath = process.argv[4]
  const workspace = createWorkspace({ workingDir: process.cwd() })
  if (workspace.isSingleProject()) {
    fail(ErrorType.WORKSPACE_ERROR, `There is no a workspace in the current directory.`)
  }

  await workspace.addProject(newProjectPath)
  console.log(chalk.green(`\nSuccess! Run 'dcl start' to preview your workspace and see the new project added.\n`))
}

export async function main() {
  if (process.argv.length <= 3) {
    fail(ErrorType.WORKSPACE_ERROR, `The subcommand is not recognized`)
  }

  const subcommandList: Record<string, () => Promise<void>> = {
    init,
    ls: listProjects,
    help: async () => console.log(help()),
    add: addProject
  }
  const subcommand = process.argv[3].toLowerCase()

  warning(`(Beta)`)

  if (subcommand in subcommandList) {
    await subcommandList[subcommand]()
  } else {
    fail(ErrorType.WORKSPACE_ERROR, `The subcommand ${subcommand} is not recognized`)
  }
}
