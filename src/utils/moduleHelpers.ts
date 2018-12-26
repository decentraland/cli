import * as path from 'path'
import * as semver from 'semver'
import { spawn } from 'child_process'
import * as fetch from 'isomorphic-fetch'
import * as packageJson from 'package-json'

import { readJSON } from '../utils/filesystem'
import { getRootPath, getNodeModulesPath } from '../utils/project'

export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

export function installDependencies(silent: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['install'], { shell: true })
    if (!silent) {
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)
    }
    child.on('close', () => resolve())
  })
}

export function buildTypescript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', 'watch'], { shell: true })
    child.stdout.pipe(process.stdout)
    child.stdout.on('data', data => {
      if (data.toString().indexOf('The compiler is watching file changes...') !== -1) {
        return resolve()
      }
    })
    child.stderr.pipe(process.stderr)
    child.on('close', () => resolve())
  })
}

export async function getLatestVersion(name: string): Promise<string> {
  if (!(await isOnline())) {
    return null
  }

  try {
    const pkg = await packageJson(name.toLowerCase())
    return pkg.version
  } catch (e) {
    return null
  }
}

export async function getInstalledVersion(name: string): Promise<string> {
  let decentralandApiPkg: { version: string }

  try {
    decentralandApiPkg = await readJSON<{ version: string }>(path.resolve(getNodeModulesPath(getRootPath()), name, 'package.json'))
  } catch (e) {
    return null
  }

  return decentralandApiPkg.version
}

export async function getOutdatedApi(): Promise<{ package: string; installedVersion: string; latestVersion: string }> {
  const decentralandApiVersion = await getInstalledVersion('decentraland-api')
  const decentralandEcsVersion = await getInstalledVersion('decentraland-ecs')

  if (decentralandEcsVersion) {
    const latestVersion = await getLatestVersion('decentraland-ecs')
    if (latestVersion && semver.lt(decentralandEcsVersion, latestVersion)) {
      return { package: 'decentraland-ecs', installedVersion: decentralandEcsVersion, latestVersion }
    }
  } else if (decentralandApiVersion) {
    const latestVersion = await getLatestVersion('decentraland-api')
    if (latestVersion && semver.lt(decentralandApiVersion, latestVersion)) {
      return { package: 'decentraland-api', installedVersion: decentralandApiVersion, latestVersion }
    }
  }

  return undefined
}

export function getInstalledCLIVersion(): string {
  return require('../../package').version
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
