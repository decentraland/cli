import chalk from 'chalk';
import fs = require('fs-extra');
import inquirer = require('inquirer');
import * as uuid from 'uuid';
import path = require('path');

import * as project from '../utils/project';
import { cliPath } from '../utils/cli-path';
import { wrapAsync } from '../utils/wrap-async';
import { getRoot } from '../utils/get-root';

import { initProject, BoilerplateType, isValidBoilerplateType, copySample, scaffoldWebsockets } from '../creation/init';
import { installDependencies, buildTypescript } from '../utils/module-helpers';


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

        sceneMeta.main = 'scene.xml'; // replaced by chosen template
        sceneMeta.scene.base = sceneMeta.scene.parcels[0];

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

        fs.outputFileSync(
          path.join(dirName, '.dclignore'),
          [
            '.*',
            'package.json',
            'package-lock.json',
            'yarn-lock.json',
            'build.json',
            'tsconfig.json',
            'tslint.json',
            'node_modules/',
            '*.ts',
            '*.tsx',
            'dist/'
          ].join('\n')
        );

        initProject(args, sceneMeta);

        this.log(`\nNew project created in '${dirName}' directory.\n`);

        let boilerplateType = args.options.boilerplate;
        let websocketServer: string;

        if (args.options.boilerplate === undefined) {
          const results = await inquirer.prompt({
            type: 'list',
            name: 'archetype',
            message: chalk.yellow('Which type of project would you like to generate?'),
            choices: [
              { name: 'Static a-minus scene project', value: BoilerplateType.STATIC },
              { name: 'Dynamic Typescript project', value: BoilerplateType.TYPESCRIPT },
              { name: 'Remote project (WebSockets)', value: BoilerplateType.WEBSOCKETS }
            ],
            default: BoilerplateType.STATIC,
          });

          boilerplateType = results.archetype;

          if (results.archetype === BoilerplateType.WEBSOCKETS) {
            const ws = await inquirer.prompt({
              type: 'input',
              name: 'server',
              message: `${chalk.blue('Your websocket server')}`,
              default: 'ws://localhost:3000'
            });

            websocketServer = ws.server;
          }
        } else if (!isValidBoilerplateType(boilerplateType)) {
          vorpal.log(chalk.red(`Invalid boilerplate type. Supported types are 'static', 'ts' and 'ws'.`));
          process.exit(1);
        }

        switch (boilerplateType) {
          case BoilerplateType.TYPESCRIPT: {
            copySample('basic-ts');
            const files = fs.readdirSync(process.cwd());

            if (files.find(file => file === 'package.json')) {
              await installDependencies();
            }

            break;
          }
          case BoilerplateType.WEBSOCKETS:
            scaffoldWebsockets(websocketServer);
            break;
          case BoilerplateType.STATIC:
          default:
            copySample('basic-static');
            break;
        }
      })
    );
}