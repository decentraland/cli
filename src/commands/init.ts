import chalk from 'chalk';
import fs = require('fs-extra');
import inquirer = require('inquirer');
import * as project from '../utils/project';
import { cliPath }from '../utils/cli-path';
import { prompt } from '../utils/prompt';
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

      const sceneMeta = await inquirer.prompt([
        { type: 'input', name: 'display.title', message: chalk.blue('Project title: '), default: project.getRandomName() },
        { type: 'input', name: 'display.favicon', message: chalk.blue('Project favicon: '), default: 'favicon_asset' },
        { type: 'input', name: 'owner', message: chalk.blue('Your MetaMask address: ') },
        { type: 'input', name: 'contact.name', message: chalk.blue('Your name: ') },
        { type: 'input', name: 'contact.email', message: chalk.blue('Your email: ') },
        { type: 'input', name: 'main', message: chalk.blue('Main: '), default: 'scene' },
        { type: 'input', name: 'tags', message: chalk.blue('Tags: ') },
        { type: 'input', name: 'scene.parcels', message: `${chalk.blue('Parcels')} ${chalk.grey('(use the format \'x,y; x,y; x,y ...\'):')} ` },
        { type: 'input', name: 'communications.type', message: chalk.blue('Communication type: '), default: 'webrtc' },
        { type: 'input', name: 'communications.signalling', message: chalk.blue('Link to signalling server: '), default: 'https://signalling-01.decentraland.org' },
        { type: 'input', name: 'policy.contentRating', message: chalk.blue('Content rating: '), default: 'E' },
        { type: 'confirm', name: 'policy.fly', message: chalk.blue('Allow flying?: '), default: true },
        { type: 'confirm', name: 'policy.voiceEnabled', message: chalk.blue('Allow voice?: '), default: true },
        { type: 'input', name: 'policy.blacklist', message: `${chalk.blue('Blacklisted parcels')} ${chalk.grey('(use the format \'x,y; x,y; x,y ...\'):')} ` },
        { type: 'input', name: 'policy.teleportPosition', message: `${chalk.blue('Teleport position')} ${chalk.grey('(use the format \'x,y\'):')} ` },
      ]);

      // Additional data parsing
      sceneMeta.tags = sceneMeta.tags
        ? sceneMeta.tags
          .split(',')
          .map((tag: string) => tag.replace(/\s/g, ''))
          .filter((tag: string) => tag.length > 0)
        : [];

      sceneMeta.scene.parcels = sceneMeta.scene.parcels
        ? sceneMeta.scene.parcels.split(';').map((coord: string) => coord.replace(/\s/g, ''))
        : [];

      sceneMeta.policy.blacklist = sceneMeta.policy.blacklist
        ? sceneMeta.policy.blacklist.split(';').map((coord: string) => coord.replace(/\s/g, ''))
        : [];

      sceneMeta.scene.base = sceneMeta.scene.parcels[0] || '';

      // Print the data to console
      self.log('');
      self.log(`Scene metadata: (${chalk.grey('scene.json')})`);
      self.log('');
      self.log(chalk.blue(JSON.stringify(sceneMeta, null, 2)));
      self.log('');
      self.log(chalk.grey('(you can always update the metadata manually later)'));
      self.log('');

      const results = await self.prompt({
        type: 'confirm',
        name: 'continue',
        default: true,
        message: chalk.yellow('Do you want to continue?')
      });

      if (!results.continue) {
        callback();
        return;
      }

      const parsedProjectName = sceneMeta.display.title.toLowerCase().replace(/\s/g, '-');
      let projectDir;
      if (args.options.path && args.options.path === '.') {
        projectDir = args.options.path;
      } else {
        projectDir = args.options.path
          ? `${args.options.path}/${parsedProjectName}`
          : parsedProjectName;
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
