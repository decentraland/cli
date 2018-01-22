import fs = require('fs-extra');
import { cliPath }from './cli-path';
import { isDev } from './is-dev';

export function isOutdated(): boolean {
  const path = isDev ? './tmp' : '.';
  const localHash = fs.readdirSync(`${path}/.decentraland/linker-app/_next`);
  const latestHash = fs.readdirSync(`${cliPath}/dist/linker-app/_next`);

  return localHash.sort()[0] !== latestHash.sort()[0];
}
