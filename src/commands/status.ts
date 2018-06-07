import { wrapCommand } from '../utils/wrapCommand'
import { Decentraland } from '../lib/Decentraland'
import * as Coordinates from '../utils/coordinateHelpers'
import { ErrorType, fail } from '../utils/errors'
import { formatList } from '../utils/logging'

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
          vorpal.log(formatList(await dcl.getProjectStatus(), { spacing: 2, padding: 2 }))
        } else if (typeof args.target === 'string' && args.target.startsWith('coord:')) {
          const raw = args.target.replace('coord:', '')
          const coords = Coordinates.getObject(raw)
          const serializedList = formatList(await dcl.getParcelStatus(coords.x, coords.y), { spacing: 2, padding: 2 })
          vorpal.log(`\n  Deployment status for ${raw}:`)
          vorpal.log(serializedList)
        } else {
          fail(ErrorType.INFO_ERROR, `Invalid value: ${args.target}`)
        }
      })
    )
}
