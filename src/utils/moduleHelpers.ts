import * as path from 'path'
import { spawn } from 'child_process'
import * as semver from 'semver'
import * as fetch from 'isomorphic-fetch'
import * as packageJson from 'package-json'

import * as spinner from '../utils/spinner'
import { readJSON } from '../utils/filesystem'
import { getNodeModulesPath } from '../utils/project'

export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'
let version = null

export function setVersion(v: string) {
  version = v
}

export function buildTypescript(workingDir: string, watch: boolean): Promise<void> {
  const command = watch ? 'watch' : 'build'
  console.log(`Building project using "npm run ${command}"`)
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', command], {
      shell: true,
      cwd: workingDir,
      env: { ...process.env, NODE_ENV: '' }
    })

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.stdout.on('data', data => {
      if (data.toString().indexOf('The compiler is watching file changes...') !== -1) {
        spinner.succeed('Project built.')
        return resolve()
      }
    })

    child.on('close', code => {
      if (code !== 0) {
        const msg = 'Error while building the project'
        spinner.fail(msg)
        reject(new Error(msg))
      } else {
        spinner.succeed('Project built.')
        return resolve()
      }
    })
  })
}

export async function getLatestVersion(name: string): Promise<string> {
  if (!(await isOnline())) {
    return null
  }

  try {
    // NOTE: this packageJson function should receive the workingDir
    const pkg = await packageJson(name.toLowerCase())
    return pkg.version
  } catch (e) {
    return null
  }
}

export async function getInstalledVersion(workingDir: string, name: string): Promise<string> {
  let decentralandApiPkg: { version: string }

  try {
    decentralandApiPkg = await readJSON<{ version: string }>(
      path.resolve(getNodeModulesPath(workingDir), name, 'package.json')
    )
  } catch (e) {
    return null
  }

  return decentralandApiPkg.version
}

export async function getOutdatedApi(
  workingDir: string
): Promise<{
  package: string
  installedVersion: string
  latestVersion: string
}> {
  const decentralandApiVersion = await getInstalledVersion(workingDir, 'decentraland-api')
  const decentralandEcsVersion = await getInstalledVersion(workingDir, 'decentraland-ecs')

  if (decentralandEcsVersion) {
    const latestVersion = await getLatestVersion('decentraland-ecs')
    if (latestVersion && semver.lt(decentralandEcsVersion, latestVersion)) {
      return {
        package: 'decentraland-ecs',
        installedVersion: decentralandEcsVersion,
        latestVersion
      }
    }
  } else if (decentralandApiVersion) {
    const latestVersion = await getLatestVersion('decentraland-api')
    if (latestVersion && semver.lt(decentralandApiVersion, latestVersion)) {
      return {
        package: 'decentraland-api',
        installedVersion: decentralandApiVersion,
        latestVersion
      }
    }
  }

  return undefined
}

export function getInstalledCLIVersion(): string {
  return version || require('../../package.json').version
}

export function isStableVersion(): boolean {
  return !getInstalledCLIVersion().includes('commit')
}

export async function isCLIOutdated(): Promise<boolean> {
  const cliVersion = getInstalledCLIVersion()
  const cliVersionLatest = await getLatestVersion('decentraland')

  if (cliVersionLatest && cliVersion && semver.lt(cliVersion, cliVersionLatest)) {
    return true
  } else {
    return false
  }
}

export function isOnline(): Promise<boolean> {
  return new Promise(resolve => {
    fetch('https://decentraland.org/ping')
      .then(() => resolve(true))
      .catch(() => resolve(false))
    setTimeout(() => {
      resolve(false)
    }, 4000)
  })
}

export async function checkECSVersions(workingDir: string) {
  const ecsPackageJson = await readJSON<{
    requiredCliVersion?: boolean
    minCliVersion?: string
    version: string
  }>(path.resolve(getNodeModulesPath(workingDir), 'decentraland-ecs', 'package.json'))

  const cliPackageJson = await readJSON<{ minEcsVersion?: boolean; version: string }>(
    path.resolve(__dirname + '../../', 'package.json')
  )

  if (
    cliPackageJson.minEcsVersion &&
    semver.lt(ecsPackageJson.version, cliPackageJson.minEcsVersion)
  ) {
    throw new Error(
      [
        'This version of decentraland-cli (dcl) requires an ECS version higher than',
        cliPackageJson.minEcsVersion,
        'the installed version is',
        ecsPackageJson.version,
        'please go to <link> to know more about the versions and upgrade guides'
      ].join(' ')
    )
  }
  if (
    ecsPackageJson.requiredCliVersion &&
    semver.lt(ecsPackageJson.minCliVersion, cliPackageJson.version)
  ) {
    throw new Error(
      [
        'This version of decentraland-ecs requires a version of the ECS decentraland-cli (dcl) higher than',
        ecsPackageJson.minCliVersion,
        'the installed version is',
        cliPackageJson.version,
        'please go to <link> to know more about the versions and upgrade guides'
      ].join(' ')
    )
  }
}
