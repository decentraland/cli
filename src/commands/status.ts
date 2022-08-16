import chalk from 'chalk'
import arg from 'arg'

import { Decentraland } from '../lib/Decentraland'
import { formatList } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { isValid, getObject } from '../utils/coordinateHelpers'
import { fail, ErrorType } from '../utils/errors'
import { parseTarget } from '../utils/land'

export const help = () => `
  Usage: ${chalk.bold('dcl status [target] [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -n, --network             Choose between ${chalk.bold(
        'mainnet'
      )} and ${chalk.bold('goerli')} (default 'mainnet')


    ${chalk.dim('Examples:')}

    - Get Decentraland Scene information of the current project"

      ${chalk.green('$ dcl status')}

    - Get Decentraland Scene information of the parcel ${chalk.bold('-12, 40')}"

      ${chalk.green('$ dcl status -12,40')}
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
  let coords

  if (target) {
    if (!isValid(target)) {
      fail(ErrorType.STATUS_ERROR, `Invalid target "${chalk.bold(target)}"`)
    }

    coords = getObject(target)
  }

  const project = dcl.workspace.getSingleProject()
  if (!coords && project) {
    await project.validateExistingProject()
    coords = await project.getParcelCoordinates()
  }

  if (!coords) {
    fail(ErrorType.STATUS_ERROR, `Cannot get the coords`)
    return
  } else {
    const { cid, files } = await dcl.getParcelStatus(coords.x, coords.y)
    Analytics.statusCmd({ type: 'coordinates', target: coords })
    logStatus(files, cid, `${coords.x},${coords.y}`)
  }
}

function logStatus(files: any[], cid: string, coords: string) {
  const serializedList = formatList(files, { spacing: 2, padding: 2 })

  if (files.length === 0) {
    console.log(chalk.italic('\n  No information available'))
  } else {
    console.log(`\n  Deployment status for ${coords}:`)
    if (cid) {
      console.log(`\n    Project CID: ${cid}`)
    }
    console.log(serializedList)
  }
}
