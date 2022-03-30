import path from 'path'
import { spawn } from 'child_process'
import semver from 'semver'
import fetch from 'isomorphic-fetch'
import packageJson from 'package-json'

import * as spinner from '../utils/spinner'
import { readJSON } from '../utils/filesystem'
import { getNodeModulesPath } from '../utils/project'

export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'
let version: string | null = null

export function setVersion(v: string) {
  version = v
}

export function buildTypescript({
  workingDir,
  watch,
  production,
  silence = false
}: {
  workingDir: string
  watch: boolean
  production: boolean
  silence?: boolean
}): Promise<void> {
  const command = watch ? 'watch' : 'build'
  const NODE_ENV = production ? 'production' : ''

  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', command], {
      shell: true,
      cwd: workingDir,
      env: { ...process.env, NODE_ENV }
    })

    if (!silence) {
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)
    }

    child.stdout.on('data', (data) => {
      if (
        data.toString().indexOf('The compiler is watching file changes...') !==
        -1
      ) {
        if (!silence) spinner.succeed('Project built.')
        return resolve()
      }
    })

    child.on('close', (code) => {
      if (code !== 0) {
        const msg = 'Error while building the project'
        if (!silence) spinner.fail(msg)
        reject(new Error(msg))
      } else {
        if (!silence) spinner.succeed('Project built.')
        return resolve()
      }
    })
  })
}

export async function getLatestVersion(name: string): Promise<string> {
  if (!(await isOnline())) {
    return ''
  }

  try {
    // NOTE: this packageJson function should receive the workingDir
    const pkg = await packageJson(name.toLowerCase())
    return pkg.version as string
  } catch (e) {
    return ''
  }
}

export async function getInstalledVersion(
  workingDir: string,
  name: string
): Promise<string> {
  let decentralandApiPkg: { version: string }

  try {
    decentralandApiPkg = await readJSON<{ version: string }>(
      path.resolve(getNodeModulesPath(workingDir), name, 'package.json')
    )
  } catch (e) {
    return ''
  }

  return decentralandApiPkg.version
}

export async function getOutdatedApi(workingDir: string): Promise<
  | {
      package: string
      installedVersion: string
      latestVersion: string
    }
  | undefined
> {
  const decentralandApiVersion = await getInstalledVersion(
    workingDir,
    'decentraland-api'
  )
  const decentralandEcsVersion = await getInstalledVersion(
    workingDir,
    'decentraland-ecs'
  )

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

export async function getCLIPackageJson<T = any>(): Promise<T> {
  return readJSON<T>(path.resolve(__dirname, '..', '..', 'package.json'))
}

export function getInstalledCLIVersion(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return version || require('../../package.json').version
}

export function isStableVersion(): boolean {
  return !getInstalledCLIVersion().includes('commit')
}

export async function isCLIOutdated(): Promise<boolean> {
  const cliVersion = getInstalledCLIVersion()
  const cliVersionLatest = await getLatestVersion('decentraland')

  if (
    cliVersionLatest &&
    cliVersion &&
    semver.lt(cliVersion, cliVersionLatest)
  ) {
    return true
  } else {
    return false
  }
}

export function isOnline(): Promise<boolean> {
  return new Promise((resolve) => {
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
    minCliVersion?: string
    version: string
  }>(
    path.resolve(
      getNodeModulesPath(workingDir),
      'decentraland-ecs',
      'package.json'
    )
  )

  const cliPackageJson = await getCLIPackageJson<{
    minEcsVersion?: boolean
    version: string
  }>()

  if (
    cliPackageJson.minEcsVersion &&
    semver.lt(ecsPackageJson.version, `${cliPackageJson.minEcsVersion}`)
  ) {
    throw new Error(
      [
        'This version of decentraland-cli (dcl) requires an ECS version higher than',
        cliPackageJson.minEcsVersion,
        'the installed version is',
        ecsPackageJson.version,
        'please go to https://docs.decentraland.org/development-guide/installation-guide/ to know more about the versions and upgrade guides'
      ].join(' ')
    )
  }
  if (
    ecsPackageJson.minCliVersion &&
    semver.lt(cliPackageJson.version, ecsPackageJson.minCliVersion)
  ) {
    throw new Error(
      [
        'This version of decentraland-ecs requires a version of the ECS decentraland-cli (dcl) higher than',
        ecsPackageJson.minCliVersion,
        'the installed version is',
        cliPackageJson.version,
        'please go to https://docs.decentraland.org/development-guide/installation-guide/ to know more about the versions and upgrade guides'
      ].join(' ')
    )
  }
}
