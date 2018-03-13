import fs = require('fs-extra');
import path = require('path');
import { cliPath }from './cli-path';
import { getRoot } from './get-root';

export function isOutdated(): boolean {
  const root = getRoot();
  const localHash = fs.readdirSync(path.join(root, '.decentraland', 'linker-app', '_next'));
  const latestHash = fs.readdirSync(path.join(cliPath, 'dist', 'linker-app', '_next'));

  return localHash.sort()[0] !== latestHash.sort()[0];
}
