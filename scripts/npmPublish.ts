#!/usr/bin/env node
import { exec } from 'child_process'
import * as packageJson from 'package-json'
import git = require('git-rev-sync')

async function execute(command): Promise<string> {
  return new Promise<string>((onSuccess, onError) => {
    console.log(`> ${command}`)
    exec(command, (error, stdout, stderr) => {
      stdout.trim().length && console.log('  ' + stdout.replace(/\n/g, '\n  '))
      stderr.trim().length && console.error('! ' + stderr.replace(/\n/g, '\n  '))

      if (error) {
        onError(stderr)
      } else {
        onSuccess(stdout)
      }
    })
  })
}

async function publish(npmTag: string[] = []): Promise<string> {
  return execute(`npm publish` + npmTag.map($ => ' "--tag=' + $ + '"').join(''))
}

function getVersion(): string {
  return require('../package.json').version
}

function setVersion(newVersion: string): Promise<string> {
  return execute(`npm version "${newVersion}" --force --no-git-tag-version --allow-same-version`)
}

function getSnapshotVersion(): string {
  const commit = git.short()
  const time = new Date()
    .toISOString()
    .replace(/(\..*$)/g, '')
    .replace(/([^\dT])/g, '')
    .replace('T', '')

  const betaVersion = `${getVersion()}-${time}.commit-${commit}`
  return betaVersion
}

async function getLatestVersion(): Promise<string> {
  const pkg = await packageJson('decentraland')
  return pkg.version
}

console.log(`Working directory: ${process.cwd()}`)

async function main() {
  const branch = process.env.CIRCLE_BRANCH || process.env.BRANCH_NAME || git.branch()

  let newVersion = getSnapshotVersion()
  let npmTag: 'next' | 'latest' = 'next'

  const currentVersion = getVersion()
  const latestVersion = await getLatestVersion()

  if (currentVersion !== latestVersion) {
    newVersion = currentVersion
    npmTag = 'latest'
  }

  console.log(`Using branch: ${branch}`)

  if (branch !== 'master') {
    console.log('The branch is not master. Cancelling package publish process.')
    process.exit(0)
  }

  console.log(`Current "latest" published version: ${latestVersion}`)
  console.log(`New version: ${newVersion}`)
  console.log(`Publishing with tag "${npmTag}"`)

  await setVersion(newVersion)
  await publish([npmTag])
}

main().catch(e => {
  console.error('Error: there was an error during the package publish process', e)
  process.exit(1)
})
