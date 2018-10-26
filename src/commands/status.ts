import { wrapCommand } from '../utils/wrapCommand'
import { Decentraland } from '../lib/Decentraland'
import * as Coordinates from '../utils/coordinateHelpers'
import { formatList, italic } from '../utils/logging'
import { Analytics } from '../utils/analytics'

export interface IArguments {
  target: string
}

const command = 'status [target]'
const description = 'Displays the deployment status of the project or a given LAND'
const example = `
  Example usage:

    dcl status      - Returns the deployment status of the current project
    dcl status 1,1  - Returns the deployment status of the LAND located at the given coordinates
`

export function status(vorpal: any) {
  vorpal
    .command(command)
    .description(description)
    .help(() => vorpal.log(`\n  Usage: ${command}\n\n  ${description}${example}`))
    .parse((command, args) => {
      // Vorpal doesn't like negative numbers (confused with flags), walkaround:
      const parts: string[] = args.split(' ')
      const target = parts.shift()
      const rest = parts.join(' ')

      if (Coordinates.isValid(target)) {
        return `status coord:${target} ${rest}`
      }

      return command
    })
    .action(
      wrapCommand(async (args: IArguments) => {
        const dcl = new Decentraland()

        if (!args.target) {
          await dcl.project.validateExistingProject()
          const coords = await dcl.project.getParcelCoordinates()
          const { lastModified, files } = await dcl.getParcelStatus(coords.x, coords.y)
          Analytics.statusCmd({ type: 'coordinates', target: coords })
          logStatus(vorpal, files, lastModified, `${coords.x},${coords.y}`)
        } else if (typeof args.target === 'string' && args.target.startsWith('coord:')) {
          const raw = args.target.replace('coord:', '')
          const coords = Coordinates.getObject(raw)
          const { lastModified, files } = await dcl.getParcelStatus(coords.x, coords.y)
          Analytics.statusCmd({ type: 'coordinates', target: coords })
          logStatus(vorpal, files, lastModified, raw)
        } else {
          vorpal.log(`\n  Invalid coordinates: ${args.target}`)
          vorpal.log(example)
        }
      })
    )
}

export function logStatus(vorpal, files: any[], lastModified: string, coords: string) {
  const serializedList = formatList(files, { spacing: 2, padding: 2 })

  if (files.length === 0) {
    vorpal.log(italic('\n  No information available'))
  } else {
    vorpal.log(`\n  Deployment status for ${coords}:`)
    if (lastModified) {
      vorpal.log(`\n    Last Deployment: ${lastModified}`)
    }
    vorpal.log(serializedList)
  }
}
