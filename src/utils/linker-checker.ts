import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import inquirer = require('inquirer');
import * as project from './project';
import { cliPath }from './cli-path';
import { isDev } from './is-dev';
import { isOutdated } from './is-outdated';
import { wrapAsync } from './wrap-async';

export function linkerChecker(vorpal: any) {
  const path = isDev ? './tmp/' : '.';

  const isDclProject = fs.pathExistsSync(`${path}/scene.json`);
  if (!isDclProject || process.argv[2].indexOf('upgrade') !== -1 || !isOutdated()) {
    return;
  }

  vorpal.log(`${chalk.red('Ethereum linker app is outdated! Please run ')}${chalk.yellow('dcl upgrade')}${chalk.red('!')}\n`);
}
