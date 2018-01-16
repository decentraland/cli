import chalk from 'chalk';
import fs = require('fs-extra');
import { cliPath }from '../utils/cli-path';
import { prompt } from '../utils/prompt';
import { sceneMeta } from '../utils/scene-meta';
import { generateHtml } from '../utils/generate-html';
import { isDev } from '../utils/is-dev';
import { wrapAsync } from '../utils/wrap-async';

export function init(vorpal: any) {
  vorpal
    .command('init')
    .description('Generates new Decentraland scene.')
    .option(
    '-p, --path <path>',
    'Output path (default is the current working directory).'
    )
    .option('--boilerplate', 'Include sample scene.')
    .action(wrapAsync(async function (args: any, callback: () => void) {
      const self = this;

      const isDclProject = await fs.pathExists('./scene.json');
      if (isDclProject) {
        self.log('Project already exists!');
        callback();
      }

      self.log(chalk.blue('Project information:'));

      sceneMeta.display.title = await prompt(self, chalk.blue(' project title: '), 'dcl-app');

      const tags = await prompt(self, chalk.blue(' tags: '), '');

      sceneMeta.tags = tags
        ? tags
          .split(',')
          .map(tag => tag.replace(/\s/g, ''))
          .filter(tag => tag.length > 0)
        : [];

      self.log(chalk.blue('Contact information:'));

      sceneMeta.owner = await prompt(self, chalk.blue(' your MetaMask address: '));
      sceneMeta.contact.name = await prompt(self, chalk.blue(' your name: '));
      sceneMeta.contact.email = await prompt(self, chalk.blue(' your email: '));

      self.log(chalk.blue('Scene information:'));
      self.log(' (use the format: \'x,y; x,y; x,y\')');

      const parcels = await prompt(self, chalk.blue(' parcels: '));

      sceneMeta.scene.parcels = parcels
        ? parcels.split(';').map((coord: string) => coord.replace(/\s/g, ''))
        : [];

      if (sceneMeta.scene.parcels.length > 0) {
        sceneMeta.scene.base = await prompt(self, chalk.blue(' base: '), sceneMeta.scene.parcels[0] || '');
      }

      self.log(chalk.blue('Communications:'));

      sceneMeta.communications.type = await prompt(self, chalk.blue(' type: '), 'webrtc');
      sceneMeta.communications.signalling = await prompt(self, chalk.blue(' signalling server: '), 'https://signalling-01.decentraland.org');

      self.log(chalk.blue('Policy:'));

      sceneMeta.policy.contentRating = await prompt(self, chalk.blue(' content rating: '), 'E');
      sceneMeta.policy.fly = await prompt(self, chalk.blue(' fly enabled: '), 'yes');
      sceneMeta.policy.voiceEnabled = await prompt(self, chalk.blue(' voice enabled: '), 'yes');

      self.log('');
      self.log(`Scene metadata: (${chalk.grey('scene.json')})`);
      self.log('');
      self.log(chalk.blue(JSON.stringify(sceneMeta, null, 2)));
      self.log('');

      const results = await self.prompt([
        {
          type: 'confirm',
          name: 'continue',
          default: true,
          message: chalk.yellow('Do you want to continue?')
        }
      ]);

      if (!results.continue) {
        callback();
        return;
      }

      let projectDir;
      if (args.options.path && args.options.path === '.') {
        projectDir = args.options.path;
      } else {
        projectDir = args.options.path
          ? `${args.options.path}/${sceneMeta.display.title}`
          : sceneMeta.display.title;
      }

      const dirName = isDev ? `tmp/${projectDir}` : `${projectDir}`;

      fs.copySync(
        `${cliPath}/dist/linker-app`,
        `${dirName}/.decentraland/linker-app`
      );
      // Project folders
      fs.ensureDirSync(`${dirName}/audio`);
      fs.ensureDirSync(`${dirName}/models`);
      fs.ensureDirSync(`${dirName}/textures`);
      fs.outputFileSync(
        `${dirName}/scene.json`,
        JSON.stringify(sceneMeta, null, 2)
      );
      self.log(`\nNew project created in '${dirName}' directory.\n`);

      async function createScene(
        pathToProject: string,
        html: string,
        withSampleScene?: boolean
      ) {
        try {
          await fs.outputFile(`${pathToProject}/scene.html`, html);

          if (withSampleScene) {
            self.log(
              `\nSample scene was placed into ${chalk.green('scene.html')}.`
            );
          }
        } catch (err) {
          self.log(err.message);
        }
      }

      if (args.options.boilerplate) {
        const html = generateHtml({ withSampleScene: true });
        await createScene(dirName, html, true);
      } else {
        const results = await self.prompt({
          type: 'confirm',
          name: 'sampleScene',
          default: true,
          message: chalk.yellow(
            'Do you want to create new project with sample scene?'
          )
        });

        if (!results.sampleScene) {
          const html = generateHtml({ withSampleScene: false });
          await createScene(dirName, html, false);
        } else {
          const html = generateHtml({ withSampleScene: true });
          await createScene(dirName, html, true);
        }
      }
    }));
}
