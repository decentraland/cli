import chalk from 'chalk';
import fs = require('fs-extra');
import inquirer = require('inquirer');
import * as uuid from 'uuid';
import path = require('path');

import * as project from '../utils/project';
import { cliPath } from '../utils/cli-path';
import { wrapAsync } from '../utils/wrap-async';
import { getRoot } from '../utils/get-root';

import { initProject, buildHtml } from '../creation/init';

export function init(vorpal: any) {
  vorpal
    .command('init')
    .description('Generates new Decentraland scene.')
    .option('-p, --path <path>', 'Output path (default is the current working directory).')
    .option('--boilerplate', 'Include sample scene.')
    .action(
      wrapAsync(async function(args: any, callback: () => void) {
        const isDclProject = await fs.pathExists('./scene.json');
        if (isDclProject) {
          this.log('Project already exists!');
          callback();
        }

        const sceneMeta = await inquirer.prompt([
          {
            type: 'input',
            name: 'display.title',
            message: chalk.blue('Scene title: '),
            default: project.getRandomName()
          },
          {
            type: 'input',
            name: 'owner',
            message: `${chalk.blue('Your ethereum address: ')} ${chalk.grey(
              '(recommended -- used to check ownership of parcels when deploying your scene)'
            )}`
          },
          {
            type: 'input',
            name: 'contact.name',
            message: `${chalk.blue('Your name: ')} ${chalk.grey(
              '(optional -- shown to other users so that they can contact you)'
            )}`
          },
          {
            type: 'input',
            name: 'contact.email',
            message: `${chalk.blue('Your email: ')} ${chalk.grey(
              '(optional -- shown to other users so that they can contact you)'
            )}`
          },
          {
            type: 'input',
            name: 'scene.parcels',
            message: `${chalk.blue('Parcels comprising the scene')} ${chalk.grey(
              '(recommended -- used to show the limts of your scene and upload to these coordinates)'
            )}\n ${chalk.blue(`Please use this format: 'x,y; x,y; x,y ...'`)}\n`
          }
        ]);
        sceneMeta.communications = {
          type: 'webrtc',
          signalling: 'https://rendezvous.decentraland.org'
        };
        sceneMeta.policy = {
          fly: true,
          voiceEnabled: true,
          blacklist: [],
          teleportPosition: '0,0,0'
        };

        sceneMeta.scene.parcels = sceneMeta.scene.parcels
          ? sceneMeta.scene.parcels.split(';').map((coord: string) => coord.replace(/\s/g, ''))
          : ['0,0'];

        sceneMeta.main = 'scene.html';
        sceneMeta.scene.base = sceneMeta.scene.parcels[0];

        // Print the data to console
        this.log(`\nScene metadata: (${chalk.grey('scene.json')})\n`);
        this.log(chalk.blue(JSON.stringify(sceneMeta, null, 2)));
        this.log(chalk.grey('\n(you can always update the metadata manually later)\n'));

        const results = await inquirer.prompt({
          type: 'confirm',
          name: 'continue',
          default: true,
          message: chalk.yellow('Do you want to continue?')
        });

        if (!results.continue) {
          callback();
          return;
        }

        const dirName = args.options.path || getRoot();
        fs.outputFileSync(
          path.join(dirName, '.decentraland', 'project.json'),
          JSON.stringify(
            {
              id: uuid.v4(),
              ipfsKey: null
            },
            null,
            2
          )
        );

        initProject(args, sceneMeta);

        this.log(`\nNew project created in '${dirName}' directory.\n`);

        let withSampleScene = args.options.boilerplate;

        if (args.options.boilerplate === undefined) {
          const results = await inquirer.prompt({
            type: 'confirm',
            name: 'sampleScene',
            default: true,
            message: chalk.yellow('Do you want to bootstrap this new project with a sample scene?')
          });

          withSampleScene = results.sampleScene;
        }

        await buildHtml(dirName, withSampleScene);
      })
    );
}
