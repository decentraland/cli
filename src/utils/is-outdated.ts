import fs = require('fs-extra');
import { cliPath }from './cli-path';
import { getRoot } from './get-root';

export function isOutdated(): boolean {
  const path = getRoot()
  const localHash = fs.readdirSync(`${path}/.decentraland/linker-app/_next`);
  const latestHash = fs.readdirSync(`${cliPath}/dist/linker-app/_next`);

  return localHash.sort()[0] !== latestHash.sort()[0];
}
