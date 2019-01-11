import * as arg from 'arg'
import chalk from 'chalk'

import commands from './commands'
import { error, warning, debug } from './utils/logging'
import { finishPendingTracking, Analytics } from './utils/analytics'
import { isCLIOutdated, getInstalledCLIVersion } from './utils/moduleHelpers'

const args = arg(
  {
    '--help': Boolean,
    '--version': Boolean,
    '-h': '--help',
    '-v': '--version'
  },
  {
    permissive: true
  }
)

const subcommand = args._[0]

const help = `
  ${chalk.bold('Decentraland CLI')}

  Usage: ${chalk.bold('dcl [command] [options]')}

    ${chalk.dim('Commands:')}

      init                Create a new Decentraland Scene project
      start               Start a local development server for a Decentraland Scene
      deploy              Upload scene to Decentraland
      info      [args]    Displays information about a LAND, an Estate or an address
      status    [args]    Displays the deployment status of the project or a given LAND
      help      [cmd]     Displays complete help for given command
      version             Display current version of dcl

    ${chalk.dim('Options:')}

      -h, --help          Displays complete help for used command or subcommand
      -v, --version       Display current version of dcl

    ${chalk.dim('Example:')}

    - Show complete help for the subcommand "${chalk.dim('deploy')}"

      ${chalk.green('$ dcl help deploy')}
`

async function main() {
  if (!process.argv.includes('--ci') && !process.argv.includes('--c')) {
    await Analytics.requestPermission()
  }

  if (await isCLIOutdated()) {
    console.log(
      warning(
        `You are running an outdated version of "${chalk.bold(
          'dcl'
        )}", run "${chalk.bold('npm i -g decentraland')}"`
      )
    )
  }

  if (subcommand === 'version' || args['--version']) {
    console.log(getInstalledCLIVersion())
    process.exit(0)
  }

  if (!subcommand) {
    console.log(help)
    process.exit(0)
  }

  if (subcommand === 'help' || args['--help']) {
    const command = args._[1]
    if (commands.has(command) && command !== 'help') {
      try {
        const { help } = await import(`./commands/${command}`)
        console.log(help())
        process.exit(0)
      } catch (e) {
        console.error(error(e.message))
        process.exit(1)
      }
    }
    console.log(help)
    process.exit(0)
  }

  if (!commands.has(subcommand)) {
    if (subcommand.startsWith('-')) {
      console.error(
        error(
          `The "${chalk.bold(
            subcommand
          )}" option does not exist, run ${chalk.bold(
            '"dcl help"'
          )} for more info.`
        )
      )
      process.exit(1)
    }
    console.error(
      error(
        `The "${chalk.bold(
          subcommand
        )}" subcommand does not exist, run ${chalk.bold(
          '"dcl help"'
        )} for more info.`
      )
    )
    process.exit(1)
  }

  try {
    const command = await import(`./commands/${subcommand}`)
    await command.main()
    await finishPendingTracking()
  } catch (e) {
    console.error(
      error(
        `\`${chalk.green(`dcl ${subcommand}`)}\` ${e.message}, run ${chalk.bold(
          `"dcl help ${subcommand}"`
        )} for more info.`
      )
    )
    debug(e)
    await Analytics.reportError(e.name, e.message, e.stack)
    process.exit(1)
  }
}

main().then(() => process.exit(0))
