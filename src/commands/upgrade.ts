import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import inquirer = require('inquirer');
import * as project from '../utils/project';
import { cliPath }from '../utils/cli-path';
import { isDev } from '../utils/is-dev';
import { wrapAsync } from '../utils/wrap-async';
import { isOutdated }from '../utils/is-outdated';

export function upgrade(vorpal: any) {
  vorpal
    .command('upgrade')
    .description('Get latest version of Ethereum linker.')
    .action(wrapAsync(async function (args: any, callback: () => void) {
      const path = isDev ? './tmp' : '.';

      const isDclProject = await fs.pathExists(`${path}/scene.json`);
      if (!isDclProject) {
        vorpal.log(
          `Seems like this is not a Decentraland project! ${chalk.grey(
            '(\'scene.json\' not found.)'
          )}`
        );
        callback();
        return;
      }

      if (isOutdated()) {
        await fs.remove(`${path}/.decentraland/linker-app`)
        await fs.copy(`${cliPath}/dist/linker-app`, `${path}/.decentraland/linker-app`);
        vorpal.log(chalk.green('Ethereum linker app updated!'));
      } else {
        vorpal.log('You have the latest version of Ethereum linker app.');
      }

      callback()
      return
    }));
}
