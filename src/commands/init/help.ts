import arg from 'arg'
import chalk from 'chalk'
import { getProjectTypes } from './utils'

export const args = arg({
  '--help': Boolean,
  '--project': String,
  '--template': String,
  '--skip-install': Boolean,
  '-h': '--help',
  '-p': '--project',
  '-t': '--template'
})

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

    --skip-install       Skip installing dependencies
    --template           The URL to a template. It must be under the decentraland or decentraland-scenes GitHub organization.
`
