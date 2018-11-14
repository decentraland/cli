import { wrapCommand } from '../utils/wrapCommand'
import { formatDictionary, italic, bold } from '../utils/logging'
import { Decentraland, Estate } from '../lib/Decentraland'
import { Analytics } from '../utils/analytics'
import { Coords, getObject, isValid } from '../utils/coordinateHelpers'

export type Arguments = {
  target: string
  host: string
  options: {
    blockchain: boolean
    contentHost?: string
  }
}

const command = 'info [target]'
const description = 'Displays information about the project, a LAND or a LAND owner\n'
const example = `
  Example usage:

    dcl info      - Returns the information of the current project
    dcl info 1,1  - Returns the information of the LAND located at the given coordinates
    dcl info 0x.. - Returns the information of all LANDs owned by the specified Ethereum address
    dcl info 5    - Returns the information of the Estate with the given ID
`

export function info(vorpal: any) {
  vorpal
    .command(command)
    .description(description)
    .option('-b, --blockchain', 'Retrieve information directly from our blockchain provider instead of our remote API.')
    .help(() => vorpal.log(`\n  Usage: ${command}\n\n  ${description}${example}`))
    .parse((command, args) => {
      // Vorpal doesn't like negative numbers (confused with flags), walkaround:
      const parts: string[] = args.split(' ')
      const target = parts.shift()
      const rest = parts.join(' ')

      if (isValid(target)) {
        return `info coord:${target} ${rest}`
      } else if (target.startsWith('0x')) {
        return `info address:${target} ${rest}`
      } else if (Number.isInteger(parseInt(target, 10))) {
        return `info estate:${target} ${rest}`
      }
      return command
    })
    .action(
      wrapCommand(async (args: Arguments) => {
        const dcl = new Decentraland({
          blockchain: args.options.blockchain,
          contentServerUrl: args.host || 'https://content-service.decentraland.zone'
        })

        if (!args.target) {
          await dcl.project.validateExistingProject()
          const coords = await dcl.project.getParcelCoordinates()
          return infoParcel(vorpal, dcl, coords)
        }

        if (args.target.startsWith('address:')) {
          const address = args.target.replace('address:', '')
          Analytics.infoCmd({ type: 'address', target: address })
          const { parcels, estates } = await dcl.getAddressInfo(address)

          const formattedParcels = parcels.reduce((acc, parcel) => {
            return { ...acc, [`${parcel.x},${parcel.y}`]: { name: parcel.name, description: parcel.description } }
          }, {})
          const formattedEstates = estates.reduce((acc, estate) => {
            return { ...acc, [`ID ${estate.id.toString()}`]: { name: estate.name, description: estate.description } }
          }, {})

          if (parcels.length === 0 && estates.length === 0) {
            return vorpal.log(italic('\n  No information available\n'))
          }

          if (parcels.length !== 0) {
            vorpal.log(`\n  LAND owned by ${address}:\n`)
            vorpal.log(formatDictionary(formattedParcels, { spacing: 2, padding: 2 }))
          }

          if (estates.length !== 0) {
            vorpal.log(`\n  Estates owned by ${address}:\n`)
            vorpal.log(formatDictionary(formattedEstates, { spacing: 2, padding: 2 }))
          }

          return
        }

        if (args.target.startsWith('coord:')) {
          const raw = args.target.replace('coord:', '')
          const coords = getObject(raw)
          return infoParcel(vorpal, dcl, coords)
        }

        if (args.target.startsWith('estate:')) {
          const estateId = parseInt(args.target.replace('estate:', ''), 10)
          return infoEstate(vorpal, dcl, estateId)
        }

        vorpal.log(`\n  Invalid argument: ${args.target}`)
        vorpal.log(example)
      })
    )
}

async function infoParcel(vorpal, dcl: Decentraland, coords: Coords) {
  Analytics.infoCmd({ type: 'coordinates', target: coords })
  const estate = await dcl.getEstateOfParcel(coords)
  const data = await dcl.getParcelInfo(coords)
  return logInfo(vorpal, estate ? { ...data, estate } : data)
}

async function infoEstate(vorpal, dcl: Decentraland, estateId: number) {
  Analytics.infoCmd({ type: 'estate', target: estateId })
  const estate = await dcl.getEstateInfo(estateId)
  return logEstate(vorpal, estate, estateId)
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

  if (scene.estate) {
    logEstate(vorpal, scene.estate, null)
  }
}

export function logEstate(vorpal, estate: Estate, id: number) {
  if (!estate) {
    vorpal.log(italic(`\n  Estate with ID ${id} doesn't exist\n`))
    return
  }

  if (estate.parcels.length === 0) {
    vorpal.log(bold(`\n  Estate with ID ${id} has been dissolved\n`))
    delete estate.parcels
  }

  vorpal.log('  Estate Metadata:\n')

  if (estate) {
    vorpal.log(formatDictionary(estate, { spacing: 2, padding: 2 }))
  }
}
