import * as arg from 'arg'
import chalk from 'chalk'

import { Decentraland, Estate } from '../lib/Decentraland'
import { formatDictionary } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { getObject, isValid } from '../utils/coordinateHelpers'

export const help = () => `
  Usage: ${chalk.bold('dcl info [target] [options]')}

    ${chalk.dim('Options:')}

      -h, --help          Displays complete help
      -b, --blockchain    Retrieve information directly from the blockchain instead of Decentraland remote API
      -c, --host          Set content server (default is https://content-service.decentraland.zone)

    ${chalk.dim('Examples:')}

    - Get information from the ${chalk.bold('parcel')} located at ${chalk.bold('12, 45')}"

      ${chalk.green('$ dcl info -12,40')}

    - Get information from the ${chalk.bold('estate')} with ID "${chalk.bold('5')}" directly from blockchain provider

      ${chalk.green('$ dcl info 5 --blockchain')}

    - Get information from the ${chalk.bold('address 0x8bed95d830475691c10281f1fea2c0a0fe51304b')}"

      ${chalk.green('$ dcl info 0x8bed95d830475691c10281f1fea2c0a0fe51304b')}
`

function getTargetType(value: string): string {
  if (isValid(value)) {
    return 'parcel'
  }

  if (Number.isInteger(parseInt(value, 10))) {
    return 'estate'
  }

  if (value.startsWith('0x')) {
    return 'address'
  }

  return
}

export async function main() {
  const args = arg(
    {
      '--help': Boolean,
      '--blockchain': Boolean,
      '--host': String,
      '-h': '--help',
      '-b': '--blockchain',
      '-c': '--host'
    },
    { permissive: true }
  )

  const target = args._[1]
  const type = getTargetType(target)

  if (!type) {
    throw new Error(`Invalid target "${chalk.bold(target)}"`)
  }

  const dcl = new Decentraland({
    blockchain: args['--blockchain'],
    contentServerUrl: args['--host'] || 'https://content-service.decentraland.zone'
  })

  if (type === 'parcel') {
    const coords = getObject(target)
    Analytics.infoCmd({ type: 'coordinates', target: coords })
    const [estate, data] = await Promise.all([dcl.getEstateOfParcel(coords), dcl.getParcelInfo(coords)])
    const output = estate ? { ...data, estate } : data
    logParcel(output)
    return
  }

  if (type === 'estate') {
    const estateId = parseInt(target, 10)
    Analytics.infoCmd({ type: 'estate', target: estateId })
    const estate = await dcl.getEstateInfo(estateId)
    logEstate(estate, estateId)
    return
  }

  Analytics.infoCmd({ type: 'address', target: target })
  const { parcels, estates } = await dcl.getAddressInfo(target)

  const formattedParcels = parcels.reduce((acc, parcel) => {
    return { ...acc, [`${parcel.x},${parcel.y}`]: { name: parcel.name, description: parcel.description } }
  }, {})
  const formattedEstates = estates.reduce((acc, estate) => {
    return { ...acc, [`ID ${estate.id.toString()}`]: { name: estate.name, description: estate.description } }
  }, {})

  if (parcels.length === 0 && estates.length === 0) {
    return console.log(chalk.italic('\n  No information available\n'))
  }

  if (parcels.length !== 0) {
    console.log(`\n  LAND owned by ${target}:\n`)
    console.log(formatDictionary(formattedParcels, { spacing: 2, padding: 2 }))
  }

  if (estates.length !== 0) {
    console.log(`\n  Estates owned by ${target}:\n`)
    console.log(formatDictionary(formattedEstates, { spacing: 2, padding: 2 }))
  }
}

function logParcel(output) {
  console.log('\n  Scene Metadata:\n')

  if (output.scene) {
    console.log(formatDictionary(output.scene, { spacing: 2, padding: 2 }))
  } else {
    console.log(chalk.italic('    No information available\n'))
  }

  console.log('  LAND Metadata:\n')

  if (output.land) {
    console.log(formatDictionary(output.land, { spacing: 2, padding: 2 }))
  } else {
    console.log(chalk.italic('    No information available\n'))
  }

  if (output.estate) {
    logEstate(output.estate)
  }
}

function logEstate(estate: Estate, id: number = null) {
  if (!estate) {
    console.log(chalk.italic(`\n  Estate with ID ${id} doesn't exist\n`))
    return
  }

  if (estate.parcels.length === 0) {
    console.log(chalk.bold(`\n  Estate with ID ${id} has been dissolved\n`))
    delete estate.parcels
  }

  console.log('  Estate Metadata:\n')

  if (estate) {
    console.log(formatDictionary(estate, { spacing: 2, padding: 2 }))
  }
}
