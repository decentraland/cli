import * as path from 'path'
import * as semver from 'semver'
import { spawn } from 'child_process'
import * as packageJson from 'package-json'
import { readJSON } from '../utils/filesystem'
import { getRootPath, getNodeModulesPath } from '../utils/project'
import * as fetch from 'isomorphic-fetch'

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
      if (data.toString().indexOf('The compiler is watching file changes...') > -1) {
        return resolve()
      }
    })
    child.stderr.pipe(process.stderr)
    child.on('close', () => resolve())
  })
}

export async function getLatestVersion(name: string): Promise<string> {
  let pkg: { version: string }

  if (!(await isOnline())) {
    return null
  }

  try {
    pkg = await packageJson(name.toLowerCase())
  } catch (e) {
    return null
  }

  return pkg.version
}

export async function getInstalledVersion(name: string): Promise<string> {
  let metaverseApiPkg: { version: string }

  try {
    metaverseApiPkg = await readJSON<{ version: string }>(path.resolve(getNodeModulesPath(getRootPath()), name, 'package.json'))
  } catch (e) {
    return null
  }

  return metaverseApiPkg.version
}

export async function isMetaverseApiOutdated(): Promise<boolean> {
  const metaverseApiVersionLatest = await getLatestVersion('decentraland-api')
  const metaverseApiVersion = await getInstalledVersion('decentraland-api')
  if (metaverseApiVersionLatest && metaverseApiVersion && semver.lt(metaverseApiVersion, metaverseApiVersionLatest)) {
    return true
  }

  return false
}

export async function getInstalledCLIVersion(): Promise<string> {
  let pkg: { version: string }

  try {
    pkg = await readJSON<{ version: string }>(path.resolve(__dirname, '../../package.json'))
  } catch (e) {
    return null
  }

  return pkg.version
}

export async function isCLIOutdated(): Promise<boolean> {
  const cliVersion = await this.getInstalledCLIVersion()
  const cliVersionLatest = await getLatestVersion('decentraland')

  if (cliVersionLatest && cliVersion && semver.lt(cliVersion, cliVersionLatest)) {
    return true
  } else {
    return false
  }
}

export function isOnline(): Promise<boolean> {
  return new Promise(resolve => {
    fetch('https://decentraland.org/')
      .then(() => resolve(true))
      .catch(() => resolve(false))
    setTimeout(() => {
      resolve(false)
    }, 4000)
  })
}
