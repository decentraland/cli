
import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import { cliPath }from '../utils/cli-path';
import { isDev } from '../utils/is-dev';

export function update(vorpal: any) {
  vorpal
    .command('update')
    .description('Update Ethereum linker tool.')
    .action(async function (args: any, callback: () => void) {
      const self = this;

      let projectName = 'dcl-app';

      if (isDev) {
        const res = await self.prompt({
          type: 'input',
          name: 'projectName',
          default: 'dcl-app',
          message:
            '(Development-mode) Project name (in \'tmp/\' folder) you want to update: '
        });

        projectName = res.projectName;

        const isDclProject = await fs.pathExists(`tmp/${projectName}/scene.json`);
        if (!isDclProject) {
          self.log(
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
          self.log(
            `Seems like this is not a Decentraland project! ${chalk.grey(
              '(\'scene.json\' not found.)'
            )}`
          );
          callback();
        }

        await fs.copy(`${cliPath}/dist/linker-app`, './.decentraland/linker-app');
        self.log('CLI linking app updated!');
      }
    });
}
