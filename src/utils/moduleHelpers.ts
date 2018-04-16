import * as path from 'path'
import * as semver from 'semver'
import { spawn } from 'child_process'
import * as packageJson from 'package-json'
import { readJSON } from '../utils/filesystem'
import { getRootPath, getNodeModulesPath } from '../utils/project'

export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

export function installDependencies(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['install'], { shell: true })
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)
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

export async function latestVersion(name: string): Promise<string> {
  const pkg = await packageJson(name.toLowerCase())
  return pkg.version
}

export async function isMetaverseApiOutdated(): Promise<boolean> {
  const metaverseApiVersionLatest = await latestVersion('metaverse-api')
  let metaverseApiPkg: { version: number }

  try {
    metaverseApiPkg = await readJSON<{ version: number }>(path.resolve(getNodeModulesPath(getRootPath()), 'metaverse-api', 'package.json'))
  } catch (e) {
    // metaverse-api is not installed, thus it can't be outdated
    return false
  }

  if (semver.lt(metaverseApiPkg.version, metaverseApiVersionLatest)) {
    return true
  }

  return false
}

export async function isCLIOutdated(): Promise<boolean> {
  const cliVersion = require('../../package.json').version
  const cliVersionLatest = await latestVersion('decentraland')

  if (semver.lt(cliVersion, cliVersionLatest)) {
    return true
  }

  return false
}
