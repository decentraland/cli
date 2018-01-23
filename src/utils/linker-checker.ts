import chalk from 'chalk';
import fs = require('fs-extra');
import { isOutdated } from './is-outdated';
import { getRoot } from './get-root';

export function linkerChecker(vorpal: any) {
  const path = getRoot()

  const isDclProject = fs.pathExistsSync(`${path}/scene.json`);
  if (!isDclProject || process.argv[2].indexOf('upgrade') !== -1 || !isOutdated()) {
    return;
  }

  vorpal.log(`${chalk.red('Ethereum linker app is outdated! Please run ')}${chalk.yellow('dcl upgrade')}${chalk.red('!')}\n`);
}
