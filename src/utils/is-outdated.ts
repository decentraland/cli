import fs = require('fs-extra');
import { cliPath }from './cli-path';
import { isDev } from './is-dev';

export function isOutdated(vorpal: any, callback: () => void): boolean {
  const path = isDev ? './tmp' : '.'

  try {
    fs.accessSync(`${path}/.decentraland/linker-app/_next`, fs.constants.R_OK | fs.constants.W_OK)
  } catch (err) {
    vorpal.log(`Looks like linker app is missing. Try to re-initialize your project.`)
    callback()
    return
  }

  const localHash = fs.readdirSync(`${path}/.decentraland/linker-app/_next`)
  const latestHash = fs.readdirSync(`${cliPath}/dist/linker-app/_next`)

  return localHash.sort()[0] !== latestHash.sort()[0]
}
