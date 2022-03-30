import { getCLIPackageJson } from './moduleHelpers'
import semver from 'semver'
import { FileDescriptorStandardOption, runCommand } from './shellCommands'

export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

export function getNodeVersion(): string {
  return process.versions.node
}

export async function getNpmVersion(): Promise<string> {
  let npmVersion: string = ''
  function onOutData(data: any) {
    const arrStr = data.toString().split('.')
    if (arrStr.length === 3) {
      npmVersion = data.toString().split('\n')[0]
    }
  }
  await runCommand({
    workingDir: process.cwd(),
    command: npm,
    args: ['-v'],
    fdStandards: FileDescriptorStandardOption.SEND_TO_CALLBACK,
    cb: {
      onOutData
    }
  })

  return npmVersion
}

export async function checkNodeAndNpmVersion() {
  const requiredVersion = await getCLIPackageJson<{
    userEngines: {
      minNodeVersion: string
      minNpmVersion: string
    }
  }>()

  try {
    const nodeVersion = await getNodeVersion()
    const npmVersion = await getNpmVersion()

    if (nodeVersion) {
      if (semver.lt(nodeVersion, requiredVersion.userEngines.minNodeVersion)) {
        console.error(
          `Decentraland CLI runs over node version ${requiredVersion.userEngines.minNodeVersion} or greater, current is ${nodeVersion}.`
        )
        process.exit(1)
      }
    } else {
      console.error(
        `It's not possible to check node version, version ${requiredVersion.userEngines.minNodeVersion} or greater is required to run Decentraland CLI.`
      )
      process.exit(1)
    }

    if (npmVersion) {
      if (semver.lt(npmVersion, requiredVersion.userEngines.minNpmVersion)) {
        console.warn(
          `⚠ Decentraland CLI works correctly installing packages with npm version ${requiredVersion.userEngines.minNpmVersion} or greater, current is ${npmVersion}.`
        )
      }
    } else {
      console.warn(
        `⚠ It's not possible to check npm version, version ${requiredVersion.userEngines.minNpmVersion} or greater is required to Decentraland CLI works correctly.`
      )
    }
  } catch (err) {
    console.warn(`⚠ It was not possible to check npm version or node.`, err)
  }
}
