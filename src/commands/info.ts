import * as arg from 'arg'
import chalk from 'chalk'

import { Decentraland, Estate } from '../lib/Decentraland'
import { formatDictionary, debug } from '../utils/logging'
import { Analytics } from '../utils/analytics'
import { getObject, getString, isValid } from '../utils/coordinateHelpers'
import { fail, ErrorType } from '../utils/errors'
import { parseTarget } from '../utils/land'

export const help = () => `
  Usage: ${chalk.bold('dcl info [target] [options]')}

    ${chalk.dim('Options:')}

      -h, --help                Displays complete help
      -b, --blockchain          Retrieve information directly from the blockchain instead of Decentraland remote API
      -n, --network             Choose between ${chalk.bold('mainnet')} and ${chalk.bold(
  'ropsten'
)} (default 'mainnet')


    ${chalk.dim('Examples:')}

    - Get information from the ${chalk.bold('parcel')} located at ${chalk.bold('-12, 40')}"

      ${chalk.green('$ dcl info -12,40')}

    - Get information from the ${chalk.bold('estate')} with ID "${chalk.bold(
  '5'
)}" directly from blockchain provider

      ${chalk.green('$ dcl info 5 --blockchain')}

    - Get information from the ${chalk.bold('address 0x8bed95d830475691c10281f1fea2c0a0fe51304b')}"

      ${chalk.green('$ dcl info 0x8bed95d830475691c10281f1fea2c0a0fe51304b')}
`

function getTargetType(value: string): string {
  if (isValid(value)) {
    return 'parcel'
  }

  const id = parseInt(value, 10)
  if (Number.isInteger(id) && id > 0) {
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
      '--network': String,
      '-h': '--help',
      '-b': '--blockchain',
      '-n': '--network'
    },
    { permissive: true }
  )

  if (!args._[1]) {
    fail(ErrorType.INFO_ERROR, 'Please provide a target to retrieve data')
  }

  const target = parseTarget(args._)
  debug(`Parsed target: ${target}`)
  const type = getTargetType(target)

  if (!type) {
    fail(ErrorType.INFO_ERROR, `Invalid target "${chalk.bold(target)}"`)
  }

  const dcl = new Decentraland({
    blockchain: args['--blockchain'],
    workingDir: process.cwd()
  })

  if (type === 'parcel') {
    const coords = getObject(target)
    Analytics.infoCmd({ type: 'coordinates', target: coords })
    const [estate, data] = await Promise.all([
      dcl.getEstateOfParcel(coords),
      dcl.getParcelInfo(coords)
    ])
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
    return {
      ...acc,
      [`${parcel.x},${parcel.y}`]: {
        name: parcel.name,
        description: parcel.description
      }
    }
  }, {})
  const formattedEstates = estates.reduce((acc, estate) => {
    return {
      ...acc,
      [`ID ${estate.id.toString()}`]: {
        name: estate.name,
        description: estate.description
      }
    }
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
    const estateInfo = { ...estate, parcels: singleLineParcels(estate.parcels) }
    console.log(formatDictionary(estateInfo, { spacing: 2, padding: 2 }))
  }
}

function singleLineParcels(parcels: any) {
  return parcels.map(getString).join('; ')
}
