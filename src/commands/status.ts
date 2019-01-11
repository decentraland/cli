import chalk from 'chalk'
import * as arg from 'arg'

import { Decentraland } from '../lib/Decentraland'
import { formatList } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { isValid, getObject } from '../utils/coordinateHelpers'
import { fail, ErrorType } from '../utils/errors'

export const help = () => `
  Usage: ${chalk.bold('dcl status [target] [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help

    ${chalk.dim('Examples:')}

    - Get Decentraland Scene information of the current project"

      ${chalk.green('$ dcl status')}

    - Get Decentraland Scene information of the parcel ${chalk.bold('12, 45')}"

      ${chalk.green('$ dcl status -12,40')}
`

export async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '-h': '--help'
    },
    { permissive: true }
  )

  const dcl = new Decentraland()

  const target = args._[1]
  let coords

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

  const { cid, files } = await dcl.getParcelStatus(coords.x, coords.y)
  Analytics.statusCmd({ type: 'coordinates', target: coords })
  logStatus(files, cid, `${coords.x},${coords.y}`)
}

function logStatus(files: any[], cid: string, coords: string) {
  const serializedList = formatList(files, { spacing: 2, padding: 2 })

  if (files.length === 0) {
    console.log(chalk.italic('\n  No information available'))
  } else {
    console.log(`\n  Deployment status for ${coords}:`)
    if (cid) {
      console.log(`\n    Proyect CID: ${cid}`)
    }
    console.log(serializedList)
  }
}
