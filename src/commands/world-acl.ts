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
      grant  [addr 1] ... [addr n]  Grant permission to new addresses (separated by spaces) to deploy a scene to a specified world.
      revoke [addr 1] ... [addr n]  Remove permission for given addresses (separated by spaces) to deploy a scene to a specified world.
  

    ${chalk.dim('Options:')}

      -h, --help                  Displays complete help
      -p, --port [port]           Select a custom port for the linker app (for signing with browser wallet)
      -t, --target-content [url]  Specifies the base URL for the target Worlds Content Server. Example: 'https://worlds-content-server.decentraland.org'.

    ${chalk.dim('Examples:')}
      - Show which addresses were given permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth show')}

      - Grant addresses 0x1 and 0x2 permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth grant 0x1 0x2')}

      - Revoke addresses 0x1 and 0x2 permission to deploy name.dcl.eth
      ${chalk.green('$ dcl world-acl name.dcl.eth revoke 0x1 0x2')}
`
}

export async function main() {
  if (process.argv.length <= 4) {
    fail(
      ErrorType.WORLD_CONTENT_SERVER_ERROR,
      `The subcommand is not recognized`
    )
  }

  const args = arg(spec)
  if (!args['--target-content']) {
    args['--target-content'] = 'https://worlds-content-server.decentraland.org'
  }

  Analytics.worldAcl({
    action: args._[2].toLowerCase()
  })

  const subcommandList: Record<
    string,
    (args: arg.Result<typeof spec>) => Promise<void>
  > = {
    show: showAcl,
    grant: grantAcl,
    revoke: revokeAcl,
    help: async () => console.log(help())
  }
  const subcommand = args._[2].toLowerCase()

  if (subcommand in subcommandList) {
    await subcommandList[subcommand](args)
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

async function fetchAcl(
  worldName: string,
  targetContent: string
): Promise<AccessControlList> {
  spinner.create(`Fetching acl for world ${worldName}`)
  const data = await fetch(`${targetContent}/acl/${worldName}`)
    .then(checkStatus)
    .then((res) => res.json())
    .catch(async (error) => {
      spinner.fail(await error.response.text())
      throw error
    })

  spinner.succeed()
  return data
}

async function storeAcl(
  worldName: string,
  authChain: AuthChain,
  targetContent: string
): Promise<AccessControlList> {
  spinner.create(`Storing acl for world ${worldName}`)
  const data = await fetch(`${targetContent}/acl/${worldName}`, {
    method: 'POST',
    body: JSON.stringify(authChain)
  })
    .then(checkStatus)
    .then((res) => res.json())
    .catch(async (error) => {
      const message =
        error.response.headers.get('content-type') === 'application/json'
          ? (await error.response.json()).message
          : await error.response.text()

      spinner.fail(message)
      throw Error(message)
    })

  spinner.succeed(`Stored acl for world ${worldName}`)
  return data
}

function displayPermissionToConsole(
  data: AccessControlList,
  worldName: string
) {
  if (data.allowed.length === 0) {
    console.log(
      `${chalk.dim('Only the owner of')} ${chalk.bold(worldName)} ${chalk.dim(
        'can deploy scenes under that name.'
      )}`
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
}

async function showAcl(args: arg.Result<typeof spec>) {
  const worldName = args._[1]
  const targetContent = args['--target-content']!

  await fetchAcl(worldName, targetContent)
    .then((data) => {
      displayPermissionToConsole(data, worldName)
    })
    .catch(() => process.exit(1))
}

async function grantAcl(args: arg.Result<typeof spec>) {
  const worldName = args._[1]
  const addresses = args._.slice(3)
  const targetContent = args['--target-content']!

  await fetchAcl(worldName, targetContent)
    .then(async (data) => {
      const newAllowed = [...data.allowed]
      addresses.forEach((address: EthAddress) => {
        if (!newAllowed.includes(address)) {
          newAllowed.push(address)
        }
      })

      const newAcl = { ...data, allowed: newAllowed }
      if (newAcl.allowed.length === data.allowed.length) {
        console.log(
          'No changes made. All the addresses requested to be granted access already have permission.'
        )
        return
      }

      await signAndStoreAcl(args, newAcl)
    })
    .catch(() => process.exit(1))
}

async function revokeAcl(args: arg.Result<typeof spec>) {
  const worldName = args._[1]
  const addresses = args._.slice(3)
  const targetContent = args['--target-content']!

  await fetchAcl(worldName, targetContent)
    .then(async (data) => {
      const newAllowed = [...data.allowed].filter(
        (address: EthAddress) => !addresses.includes(address)
      )

      const newAcl = { ...data, allowed: newAllowed }
      if (newAcl.allowed.length === data.allowed.length) {
        console.log(
          'No changes made. None of the addresses requested to be revoked accessed had permission.'
        )
        return
      }

      await signAndStoreAcl(args, newAcl)
    })
    .catch(() => process.exit(1))
}

async function signAndStoreAcl(
  args: arg.Result<typeof spec>,
  acl: { resource: string; allowed: EthAddress[] }
) {
  const payload = JSON.stringify(acl)

  const port = args['--port']
  const parsedPort = port ? parseInt(port, 10) : void 0
  const linkerPort =
    parsedPort && Number.isInteger(parsedPort) ? parsedPort : void 0
  const targetContent = args['--target-content']!
  const worldsContentServer = new WorldsContentServer({
    worldName: acl.resource,
    allowed: acl.allowed,
    isHttps: !!args['--https'],
    targetContent,
    linkerPort
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

    worldsContentServer.on(
      'link:success',
      ({ address, signature }: WorldsContentServerResponse) => {
        spinner.succeed(`ACL successfully signed.`)
        console.log(`${chalk.bold('Address:')} ${address}`)
        console.log(`${chalk.bold('Signature:')} ${signature}`)
      }
    )
  })

  const { signature, address } =
    await worldsContentServer.getAddressAndSignature(payload)
  const authChain = Authenticator.createSimpleAuthChain(
    payload,
    address,
    signature
  )

  await storeAcl(acl.resource, authChain, targetContent)
    .then(async (data) => {
      displayPermissionToConsole(data, acl.resource)
    })
    .catch((_) => process.exit(1))

  process.exit(0)
}
