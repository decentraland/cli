import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import { isOutdated } from './is-outdated';
import { getRoot } from './get-root';

export function linkerChecker(vorpal: any) {
  const root = getRoot();

  const isDclProject = fs.pathExistsSync(path.join(root, 'scene.json'));

  if (!isDclProject || process.argv[2].indexOf('upgrade') !== -1 || !isOutdated()) {
    return;
  }

  vorpal.log(`${chalk.red('Ethereum linker app is outdated! Please run ')}${chalk.yellow('dcl upgrade')}${chalk.red('!')}\n`);
}
