import chalk from 'chalk'
import * as arg from 'arg'

import { ping, LANDPingResponse } from '../web3/ping'
import { Decentraland } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { isValid, getObject, Coords } from '../utils/coordinateHelpers'
import { fail, ErrorType } from '../utils/errors'
import { parseTarget } from '../utils/land'
import { formatDate } from '../utils/dates'

export const help = () => `
  Usage: ${chalk.bold('dcl ping [target] [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -n, --network             Choose between ${chalk.bold('mainnet')} and ${chalk.bold(
  'ropsten'
)} (default 'mainnet')


    ${chalk.dim('Examples:')}

    - Get LAND liveness state of the current project"

      ${chalk.green('$ dcl ping')}

    - Get LAND liveness state of ${chalk.bold('-12, 40')}"

      ${chalk.green('$ dcl ping -12, 40')}
`

function getStatus(pingResponse: LANDPingResponse): string {
  if (pingResponse.hasDecayed) {
    return chalk.red('Decayed')
  }

  if (pingResponse.isNearDecay) {
    return chalk.yellow('Near decay')
  }

  return chalk.green('Active')
}

const pingReport = ({ x, y }, pingResponse: LANDPingResponse) => `
  Ping to LAND ${chalk.bold(`${x}, ${y}`)}:

    ${chalk.bold('Status:')} ${getStatus(pingResponse)}
    ${chalk.bold('Last Activity:')} ${formatDate(pingResponse.lastActive)}
    ${chalk.bold('Time since last activity (in days):')} ${pingResponse.timeSinceLastActive}
    ${
      pingResponse.hasDecayed
        ? `
    ${chalk.bold('Time since decay (in days):')} ${pingResponse.timeSinceDecay}
    ${chalk.bold('Auction price:')} ${chalk.cyan('⏣')} ${pingResponse.price}
    `
        : ''
    }
`

export async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '--network': String,
      '-h': '--help',
      '-n': '--network'
    },
    { permissive: true }
  )

  const dcl = new Decentraland({ workingDir: process.cwd() })

  const target = parseTarget(args._)
  let coords: Coords

  if (target) {
    if (!isValid(target)) {
      fail(ErrorType.STATUS_ERROR, `Invalid target "${chalk.bold(target)}"`)
    }

    coords = getObject(target)
  }

  if (!coords) {
    await dcl.project.validateExistingProject()
    coords = await dcl.project.getParcelCoordinates()
  }

  const pingResponse = await ping(coords.x, coords.y)
  Analytics.pingCmd({ type: 'coordinates', target: coords })

  console.log(pingReport(coords, pingResponse))
}
