
import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import { cliPath }from '../utils/cli-path';
import { isDev } from '../utils/is-dev';
import { wrapAsync } from '../utils/wrap-async';

export function update(vorpal: any) {
  vorpal
    .command('update')
    .description('Update Ethereum linker tool.')
    .action(wrapAsync(async function (args: any, callback: () => void) {
      let projectName = 'dcl-app';

      if (isDev) {
        const res = await vorpal.prompt({
          type: 'input',
          name: 'projectName',
          default: 'dcl-app',
          message:
            '(Development-mode) Project name (in \'tmp/\' folder) you want to update: '
        });

        projectName = res.projectName;

        const isDclProject = await fs.pathExists(`tmp/${projectName}/scene.json`);
        if (!isDclProject) {
          vorpal.log(
            `Seems like that is not a Decentraland project! ${chalk.grey(
              '(\'scene.json\' not found.)'
            )}`
          );
          callback();
        }

        await fs.copy(
          `${cliPath}/dist/linker-app`,
          `tmp/${projectName}/.decentraland/linker-app`
        );
      } else {
        const isDclProject = await fs.pathExists('./scene.json');
        if (!isDclProject) {
          vorpal.log(
            `Seems like this is not a Decentraland project! ${chalk.grey(
              '(\'scene.json\' not found.)'
            )}`
          );
          callback();
        }

        await fs.copy(`${cliPath}/dist/linker-app`, './.decentraland/linker-app');
        vorpal.log('CLI linking app updated!');
      }
    }));
}
