import arg from 'arg'
import chalk from 'chalk'

import * as log from './utils/logging'
import { finishPendingTracking, Analytics } from './utils/analytics'
import {
  getCLIPackageJson,
  getInstalledCLIVersion,
  setVersion
} from './utils/moduleHelpers'
import { loadConfig } from './config'
import commands from './commands'
import {
  getNodeMajorVersion,
  getNpmMajorVersion
} from './utils/nodeAndNpmVersion'

log.debug(`Running with NODE_ENV: ${process.env.NODE_ENV}`)
log.debug(`Provided argv: ${JSON.stringify(process.argv)}`)

const args = arg(
  {
    '--help': Boolean,
    '--version': Boolean,
    '--network': String,
    '-h': '--help',
    '-v': '--version',
    '-n': '--network'
  },
  {
    permissive: true
  }
)
log.debug(`Parsed args: ${JSON.stringify(args)}`)

const subcommand = args._[0]
log.debug(`Selected command ${chalk.bold(subcommand)}`)

const help = `
  ${chalk.bold('Decentraland CLI')}

  Usage: ${chalk.bold('dcl [command] [options]')}

    ${chalk.dim('Commands:')}

      init                  Create a new Decentraland Scene project
      build                 Build scene
      start                 Start a local development server for a Decentraland Scene
      install               Sync decentraland libraries in bundleDependencies
      install package       Install a package
      deploy                Upload scene to a particular Decentraland's Content server
      deploy-deprecated     Upload scene to Decentraland's legacy content server (deprecated).
      export                Export scene to static website format (HTML, JS and CSS)
      info      [args]      Displays information about a LAND, an Estate or an address
      status    [args]      Displays the deployment status of the project or a given LAND
      help      [cmd]       Displays complete help for given command
      version               Display current version of dcl
      coords                Set the parcels in your scene
      workspace subcommand  Make a workspace level action, dcl help workspace for more information.          

    ${chalk.dim('Options:')}

      -h, --help          Displays complete help for used command or subcommand
      -v, --version       Display current version of dcl

    ${chalk.dim('Example:')}

    - Show complete help for the subcommand "${chalk.dim('deploy')}"

      ${chalk.green('$ dcl help deploy')}
`

export async function main(version: string) {
  const requiredVersion = await getCLIPackageJson<{
    userEngines: {
      minMajorNode: number
      minMajorNpm: number
    }
  }>()

  try {
    const nodeVersion = await getNodeMajorVersion()
    const npmVersion = await getNpmMajorVersion()

    if (nodeVersion) {
      if (nodeVersion < requiredVersion.userEngines.minMajorNode) {
        console.error(
          `Decentraland CLI runs over node version ${requiredVersion.userEngines.minMajorNode} or greater, current is ${nodeVersion}.`
        )
        process.exit(1)
      }
    } else {
      console.error(
        `It's not possible to check node version, version ${requiredVersion.userEngines.minMajorNode} or greater is required to run Decentraland CLI.`
      )
      process.exit(1)
    }

    if (npmVersion) {
      if (npmVersion < requiredVersion.userEngines.minMajorNpm) {
        console.warn(
          `⚠ Decentraland CLI works correctly installing packages with npm version ${requiredVersion.userEngines.minMajorNpm} or greater, current is ${npmVersion}.`
        )
      }
    } else {
      console.warn(
        `⚠ It's not possible to check npm version, version ${requiredVersion.userEngines.minMajorNpm} or greater is required to Decentraland CLI works correctly.`
      )
    }
  } catch (err) {
    console.warn(`⚠ It was not possible to check npm version or node.`, err)
  }

  setVersion(version)
  if (!process.argv.includes('--ci') && !process.argv.includes('--c')) {
    const network = args['--network']
    if (network && network !== 'mainnet' && network !== 'ropsten') {
      console.error(
        log.error(
          `The only available values for ${chalk.bold(
            `'--network'`
          )} are ${chalk.bold(`'mainnet'`)} or ${chalk.bold(`'ropsten'`)}`
        )
      )
      process.exit(1)
    }

    await loadConfig(network || 'mainnet')
    await Analytics.requestPermission()
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
    const command = subcommand === 'help' ? args._[1] : subcommand
    if (commands.has(command) && command !== 'help') {
      try {
        const { help } = await import(`./commands/${command}`)
        console.log(help())
        process.exit(0)
      } catch (e: any) {
        console.error(log.error(e.message))
        process.exit(1)
      }
    }
    console.log(help)
    process.exit(0)
  }

  if (!commands.has(subcommand)) {
    if (subcommand.startsWith('-')) {
      console.error(
        log.error(
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
      log.error(
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
  } catch (e: any) {
    console.error(
      log.error(
        `\`${chalk.green(`dcl ${subcommand}`)}\` ${e.message}, run ${chalk.bold(
          `"dcl help ${subcommand}"`
        )} for more info.`
      )
    )
    log.debug(e)
    process.exit(1)
  }
}
