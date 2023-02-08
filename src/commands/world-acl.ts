import chalk from 'chalk'

import { ErrorType, fail } from '../utils/errors'
import * as spinner from '../utils/spinner'
import fetch, { Response } from 'node-fetch'
import { EthAddress } from '@dcl/schemas'

export function help() {
  return `
  Usage: ${chalk.bold('dcl world-acl [world-name] SUBCOMMAND [options]')}
  
    ${chalk.dim('Sub commands:')}
      show         List all addresses allowed to deploy a scene to a specified world.
      grant        Give permission to a new address to deploy a scene to a specified world.
      revoke       Remove permission for a given address to deploy a scene to a specified world.
  

    ${chalk.dim('Options:')}

      -h, --help               Displays complete help

    ${chalk.dim('Examples:')}
      - Show which addresses were given permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth show')}

      - Give addresses 0x1 and 0x2 permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth grant 0x1,0x2')}

      - Revoke addresses 0x1 and 0x2 permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth revoke 0x1,0x2')}
`
}

export async function main() {
  if (process.argv.length <= 4) {
    fail(
      ErrorType.WORLD_CONTENT_SERVER_ERROR,
      `The subcommand is not recognized`
    )
  }

  const subcommandList: Record<
    string,
    (worldName: string, args: string[]) => Promise<void>
  > = {
    show: showAcl,
    grant: grantAcl,
    revoke: revokeAcl,
    help: async () => console.log(help())
  }
  const subcommand = process.argv[4].toLowerCase()

  if (subcommand in subcommandList) {
    await subcommandList[subcommand](process.argv[3], process.argv.slice(5))
  } else {
    fail(
      ErrorType.WORLD_CONTENT_SERVER_ERROR,
      `The subcommand ${subcommand} is not recognized`
    )
  }
}

class HTTPResponseError extends Error {
  constructor(public response: Response) {
    super(
      `HTTP Error Response: ${response.status} ${response.statusText} for URL ${response.url}`
    )
  }
}
const checkStatus = (response: Response) => {
  if (response.ok) {
    // response.status >= 200 && response.status < 300
    return response
  }

  throw new HTTPResponseError(response)
}

export type AccessControlList = {
  resource: string
  allowed: EthAddress[]
}

async function fetchAcl(worldName: string): Promise<AccessControlList> {
  spinner.create(`Fetching acl for world ${worldName}`)
  const data = await fetch(`http://localhost:3000/acl/${worldName}`)
    .then(checkStatus)
    .then((res) => res.json())
    .catch(async (error) => {
      spinner.fail(await error.response.text())
      throw error
    })

  spinner.succeed()
  return data
}

async function showAcl(worldName: string, _: string[]) {
  await fetchAcl(worldName)
    .then((data) => {
      if (data.allowed.length === 0) {
        console.log(
          `${chalk.dim('Only the owner of')} ${chalk.bold(
            worldName
          )} ${chalk.dim('can deploy scenes under that name.')}`
        )
      } else {
        console.log(
          `${chalk.dim(
            'The following addresses are authorized to deploy scenes under'
          )} ${chalk.bold(worldName)}${chalk.dim(':')}`
        )
        data.allowed.forEach((address: string) => {
          console.log(`  ${chalk.bold(address)}`)
        })
      }
    })
    .catch(() => process.exit(1))
}

async function grantAcl(worldName: string, args: string[]) {
  console.log('Running grantAcl', worldName, args)
  await fetchAcl(worldName)
    .then((data) => {
      console.log(data)
      const newAllowed = [...data.allowed]
      args.forEach((address: EthAddress) => {
        if (!newAllowed.includes(address)) {
          newAllowed.push(address)
        }
      })

      // TODO create new ACL with newAllowed and sign it
      const newAcl = { ...data, allowed: newAllowed }
      console.log(newAcl)

      if (newAllowed.length === data.allowed.length) {
        console.log()
      }

      // TODO store new ACL
    })
    .catch(() => process.exit(1))
}

async function revokeAcl(worldName: string, args: string[]) {
  console.log('Running revokeAcl')
}
