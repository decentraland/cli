import chalk from 'chalk'

import { ErrorType, fail } from '../utils/errors'
import * as spinner from '../utils/spinner'
import fetch, { Response } from 'node-fetch'
import { AuthChain, EthAddress } from '@dcl/schemas'
import arg from 'arg'
import opn from 'opn'
import { Authenticator } from '@dcl/crypto'
import { WorldsContentServer } from '../lib/WorldsContentServer'
import { WorldsContentServerResponse } from '../lib/WorldsContentServerLinkerAPI'
import { Analytics } from '../utils/analytics'

const spec = {
  '--help': Boolean,
  '-h': '--help',
  '--https': Boolean,
  '--target-content': String,
  '-t': '--target-content',
  '--port': String,
  '-p': '--port'
}

export function help() {
  return `
  Usage: ${chalk.bold('dcl world-acl [world-name] SUBCOMMAND [options]')}
  
    ${chalk.dim('Sub commands:')}
      show                          List all addresses allowed to deploy a scene to a specified world.
      grant  addr                 Grant permission to new address to deploy a scene to a specified world.
      revoke addr                 Remove permission for given address to deploy a scene to a specified world.
  

    ${chalk.dim('Options:')}

      -h, --help                  Displays complete help
      -p, --port [port]           Select a custom port for the linker app (for signing with browser wallet)
      -t, --target-content [url]  Specifies the base URL for the target Worlds Content Server. Example: 'https://worlds-content-server.decentraland.org'.

    ${chalk.dim('Examples:')}
      - Show which addresses were given permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth show')}

      - Grant address 0x1 permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth grant 0x1')}

      - Revoke address 0x1 permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth revoke 0x1')}
`
}

export async function main() {
  if (process.argv.length <= 4) {
    fail(ErrorType.WORLD_CONTENT_SERVER_ERROR, `The subcommand is not recognized`)
  }

  const args = arg(spec)
  if (!args['--target-content']) {
    args['--target-content'] = 'https://worlds-content-server.decentraland.org'
  }

  Analytics.worldAcl({
    action: args._[2].toLowerCase()
  })

  const subcommandList: Record<string, (args: arg.Result<typeof spec>) => Promise<void>> = {
    show: showAcl,
    grant: grantAcl,
    revoke: revokeAcl,
    help: async () => console.log(help())
  }
  const subcommand = args._[2].toLowerCase()

  if (subcommand in subcommandList) {
    await subcommandList[subcommand](args)
  } else {
    fail(ErrorType.WORLD_CONTENT_SERVER_ERROR, `The subcommand ${subcommand} is not recognized`)
  }
}

class HTTPResponseError extends Error {
  constructor(public response: Response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText} for URL ${response.url}`)
  }
}

const checkStatus = (response: Response) => {
  if (response.ok) {
    // response.status >= 200 && response.status < 300
    return response
  }

  throw new HTTPResponseError(response)
}

export enum WorldPermissionType {
  Unrestricted = 'unrestricted',
  AllowList = 'allow-list'
}

export type AllowListPermissionSetting = {
  type: WorldPermissionType.AllowList
  wallets: string[]
}

export type WorldPermissions = {
  deployment: AllowListPermissionSetting
}

export type WorldPermissionsResponse = {
  permissions: WorldPermissions
}

async function fetchAcl(worldName: string, targetContent: string): Promise<AllowListPermissionSetting> {
  spinner.create(`Fetching acl for world ${worldName}`)
  try {
    const data: WorldPermissionsResponse = await fetch(`${targetContent}/world/${worldName}/permissions`)
      .then(checkStatus)
      .then((res) => res.json())
    spinner.succeed()
    return data.permissions.deployment
  } catch (error: any) {
    spinner.fail(await error.response.text())
    throw error
  }
}

async function storeAcl(
  worldName: string,
  headers: Record<string, string>,
  targetContent: string,
  path: string,
  method: string
) {
  spinner.create(`Storing acl for world ${worldName}`)
  try {
    await fetch(`${targetContent}${path}`, {
      method: method,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    }).then(checkStatus)

    spinner.succeed(`Stored acl for world ${worldName}`)
    return true
  } catch (error: any) {
    const message =
      error.response.headers.get('content-type') === 'application/json'
        ? (await error.response.json()).message
        : await error.response.text()

    spinner.fail(message)
    throw Error(message)
  }
}

function displayPermissionToConsole(data: AllowListPermissionSetting, worldName: string) {
  if (data.wallets.length === 0) {
    console.log(
      `${chalk.dim('Only the owner of')} ${chalk.bold(worldName)} ${chalk.dim('can deploy scenes under that name.')}`
    )
  } else {
    console.log(
      `${chalk.dim('The following addresses are authorized to deploy scenes under')} ${chalk.bold(
        worldName
      )}${chalk.dim(':')}`
    )
    data.wallets.forEach((address: string) => {
      console.log(`  ${chalk.bold(address)}`)
    })
  }
}

async function showAcl(args: arg.Result<typeof spec>) {
  const worldName = args._[1]
  const targetContent = args['--target-content']!

  try {
    const data = await fetchAcl(worldName, targetContent)
    displayPermissionToConsole(data, worldName)
  } catch (_) {
    process.exit(1)
  }
}

async function grantAcl(args: arg.Result<typeof spec>) {
  const worldName = args._[1]
  const addresses = args._.slice(3)

  try {
    if (addresses.length > 1) {
      fail(ErrorType.WORLD_CONTENT_SERVER_ERROR, `Only one address can be granted at a time.`)
    }
    await signAndStoreAcl(args, { resource: worldName, allowed: addresses[0], method: 'put' })
  } catch (error: any) {
    spinner.fail(error.message)
    throw Error(error.message)
  }
}

async function revokeAcl(args: arg.Result<typeof spec>) {
  const worldName = args._[1]
  const addresses = args._.slice(3)

  try {
    if (addresses.length > 1) {
      fail(ErrorType.WORLD_CONTENT_SERVER_ERROR, `Only one address can be revoke at a time.`)
    }
    await signAndStoreAcl(args, { resource: worldName, allowed: addresses[0], method: 'delete' })
  } catch (error: any) {
    spinner.fail(error.message)
    throw Error(error.message)
  }
}

async function signAndStoreAcl(
  args: arg.Result<typeof spec>,
  acl: { resource: string; allowed: EthAddress; method: 'put' | 'delete' }
) {
  const path = `/world/${acl.resource}/permissions/deployment/${acl.allowed}`
  const timestamp = Date.now().toString()

  const payload = [acl.method, path, timestamp, '{}'].join(':').toLowerCase()

  const port = args['--port']
  const parsedPort = port ? parseInt(port, 10) : void 0
  const linkerPort = parsedPort && Number.isInteger(parsedPort) ? parsedPort : void 0
  const targetContent = args['--target-content']!
  const worldsContentServer = new WorldsContentServer({
    worldName: acl.resource,
    allowed: [acl.allowed],
    oldAllowed: [],
    isHttps: !!args['--https'],
    targetContent,
    linkerPort,
    method: acl.method
  })

  worldsContentServer.on('link:ready', ({ url }) => {
    console.log(chalk.bold('You need to sign the acl:'))
    spinner.create(`Signing app ready at ${url}`)

    setTimeout(async () => {
      try {
        await opn(`${url}/acl`)
      } catch (e) {
        console.log(`Unable to open browser automatically`)
      }
    }, 5000)

    worldsContentServer.on('link:success', ({ address, signature }: WorldsContentServerResponse) => {
      spinner.succeed(`ACL successfully signed.`)
      console.log(`${chalk.bold('Address:')} ${address}`)
      console.log(`${chalk.bold('Signature:')} ${signature}`)
    })
  })

  const { signature, address } = await worldsContentServer.getAddressAndSignature(payload)
  const authChain = Authenticator.createSimpleAuthChain(payload, address, signature)

  const headers = getAuthHeaders(authChain, timestamp)
  try {
    await storeAcl(acl.resource, headers, targetContent, path, acl.method)
    const data = await fetchAcl(acl.resource, targetContent)
    displayPermissionToConsole(data, acl.resource)
  } catch (error) {
    process.exit(1)
  }

  process.exit()
}

export const AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'
export const AUTH_TIMESTAMP_HEADER = 'x-identity-timestamp'
export const AUTH_METADATA_HEADER = 'x-identity-metadata'

export function getAuthHeaders(authChain: AuthChain, timestamp: string) {
  const headers: Record<string, string> = {}

  authChain.forEach((link, index) => {
    headers[`${AUTH_CHAIN_HEADER_PREFIX}${index}`] = JSON.stringify(link)
  })

  headers[AUTH_TIMESTAMP_HEADER] = timestamp
  headers[AUTH_METADATA_HEADER] = JSON.stringify({})

  return headers
}
