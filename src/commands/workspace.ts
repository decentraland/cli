import chalk from 'chalk'

import { Analytics } from '../utils/analytics'
import { warning } from '../utils/logging'
import { fail, ErrorType } from '../utils/errors'

import { initializeWorkspace } from '../lib/Workspace'

export const help = () => `
  Usage: ${chalk.bold('dcl workspace SUBCOMMAND [options]')}
  
    ${chalk.dim('Sub commands:')}
    
    init             Create a workspace looking for subfolder Decentraland projects.
    
    ${chalk.dim('Options:')}

    -h, --help               Displays complete help
`

export async function main() {
  if (process.argv.length <= 3) {
    throw new Error(`The subcommand is not recognized`)
  }

  const subcommand = process.argv[3].toLowerCase()

  if (subcommand === 'init') {
    warning(`(Beta)`)

    try {
      await initializeWorkspace(process.cwd())
      console.log(
        chalk.green(`\nSuccess! Run 'dcl start' to preview your workspace.\n`)
      )
    } catch (err: any) {
      fail(ErrorType.INIT_ERROR, err.message)
    }

    Analytics.sceneCreated({ projectType: 'workspace' })
  } else if (subcommand === 'help') {
    console.log(help())
  } else {
    throw new Error(`The subcommand ${subcommand} is not recognized`)
  }
}
