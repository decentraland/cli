import { wrapCommand } from '../utils/wrapCommand'
import { formatDictionary, italic } from '../utils/logging'
import { Decentraland, Estate } from '../lib/Decentraland'
import * as Coordinates from '../utils/coordinateHelpers'
import { Analytics } from '../utils/analytics'

export interface IArguments {
  target: string
}

const command = 'info [target]'
const description = 'Displays information about the project, a LAND or a LAND owner\n'
const example = `
  Example usage:

    dcl info      - Returns the information of the current project
    dcl info 1,1  - Returns the information of the LAND located at the given coordinates
    dcl info 0x.. - Returns the information of all LANDs owned by the specified Ethereum address
`

export function info(vorpal: any) {
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
        return `info coord:${target} ${rest}`
      } else if (target.startsWith('0x')) {
        return `info address:${target} ${rest}`
      } else if (Number.isInteger(parseInt(target, 10))) {
        return `info estate:${target} ${rest}`
      }
      return command
    })
    .action(
      wrapCommand(async (args: IArguments) => {
        const dcl = new Decentraland()

        if (!args.target) {
          await dcl.project.validateExistingProject()
          const estateId = await dcl.project.getEstate()
          if (estateId) {
            Analytics.infoCmd({ type: 'estate', target: estateId })
            const estate = await dcl.getEstateInfo(estateId)
            return logEstate(vorpal, estate, estateId)
          }
          const coords = await dcl.project.getParcelCoordinates()
          Analytics.infoCmd({ type: 'coordinates', target: coords })
          const scene = await dcl.getProjectInfo(coords.x, coords.y)
          return logInfo(vorpal, scene)
        }

        if (args.target.startsWith('address:')) {
          const address = args.target.replace('address:', '')
          Analytics.infoCmd({ type: 'address', target: address })
          const parcels = await dcl.getAddressInfo(address)
          const formatted = parcels.reduce((acc, parcel) => {
            return { ...acc, [`${parcel.x},${parcel.y}`]: { name: parcel.name, description: parcel.description, ipns: parcel.ipns } }
          }, {})

          if (parcels.length === 0) {
            vorpal.log(italic('\n  No information available\n'))
          } else {
            vorpal.log(`\n  LAND owned by ${address}:\n`)
            vorpal.log(formatDictionary(formatted, { spacing: 2, padding: 2 }))
          }
          return
        }

        if (args.target.startsWith('coord:')) {
          const raw = args.target.replace('coord:', '')
          const coords = Coordinates.getObject(raw)
          Analytics.infoCmd({ type: 'coordinates', target: coords })
          const data = await dcl.getParcelInfo(coords.x, coords.y)
          return logInfo(vorpal, data)
        }

        if (args.target.startsWith('estate:')) {
          const estateId = parseInt(args.target.replace('estate:', ''), 10)
          Analytics.infoCmd({ type: 'estate', target: estateId })
          const estate = await dcl.getEstateInfo(estateId)
          return logEstate(vorpal, estate, estateId)
        }

        vorpal.log(`\n  Invalid argument: ${args.target}`)
        vorpal.log(example)
      })
    )
}

export function logInfo(vorpal, scene) {
  vorpal.log('\n  Scene Metadata:\n')

  if (scene.scene) {
    vorpal.log(formatDictionary(scene.scene, { spacing: 2, padding: 2 }))
  } else {
    vorpal.log(italic('    No information available\n'))
  }

  vorpal.log('  LAND Metadata:\n')

  if (scene.land) {
    vorpal.log(formatDictionary(scene.land, { spacing: 2, padding: 2 }))
  } else {
    vorpal.log(italic('    No information available\n'))
  }
}

export function logEstate(vorpal, estate: Estate, id: number) {
  if (!estate) {
    vorpal.log(italic(`\n  Estate with ID ${id} doesn't exist\n`))
    return
  }

  vorpal.log('  Estate Metadata:\n')

  if (estate) {
    vorpal.log(formatDictionary(estate, { spacing: 2, padding: 2 }))
  }
}
