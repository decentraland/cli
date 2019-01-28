import * as path from 'path'
import chalk from 'chalk'
import * as semver from 'semver'
import { spawn } from 'child_process'
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

export async function checkAndInstallDependencies(
  workingDir: string,
  silent: boolean
): Promise<void> {
  const online = await isOnline()

  if (!online) {
    throw new Error('Unable to install dependencies: no internet connection')
  }

  return installDependencies(workingDir, silent)
}

async function installDependencies(workDir: string, silent: boolean): Promise<void> {
  spinner.create('Installing dependencies')
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['install'], { shell: true, cwd: workDir })
    if (!silent) {
      child.stdout.pipe(process.stdout)
    }
    child.stderr.pipe(process.stderr)
    child.on('close', code => {
      if (code !== 0) {
        spinner.fail()
        reject(
          new Error(
            `${chalk.bold(
              `npm install`
            )} exited with code ${code}. Please try running the command manually`
          )
        )
      }

      spinner.succeed()
      resolve()
    })
  })
}

export function buildTypescript(workingDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', 'watch'], { shell: true, cwd: workingDir })
    child.stdout.pipe(process.stdout)
    child.stdout.on('data', data => {
      if (data.toString().indexOf('The compiler is watching file changes...') !== -1) {
        return resolve()
      }
    })
    child.stderr.pipe(process.stderr)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error('Error while building the project'))
      } else {
        resolve()
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
