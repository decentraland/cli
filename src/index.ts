/**
 * Decentraland CLI.
 *
 * Command line tool for parcel management.
 */

// Use custom vorpal type definitions until there's official one
/// <reference path="../typings/vorpal.d.ts" />
/// <reference path="../typings/dcl.d.ts" />

import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import ProgressBar = require('progress');
import vorpal = require('vorpal');
const ipfsAPI = require('ipfs-api');
const copyfiles = require('copyfiles');
import generateHtml from './utils/generate-html';
import isDev from './utils/is-dev';
import linker from './utils/linker';
import start from './utils/start-server';
import { prompt } from './utils/prompt';
const pkg = require('../package.json');



/**
 * Export the current version.
 */
export const VERSION = pkg.version;

/**
 * CLI delimiter.
 */
export const DELIMITER = 'dcl $';

/**
 * CLI instance.
 */
export const cli = vorpal();

const cliPath = path.resolve(__dirname, '..');


/**
 * `upload` command for uploading scene to IPFS.
 */
cli
  .command('update-linker')
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

/**
 * `init` command for generating new Decentraland scene.
 */
cli
  .command('init')
  .description('Generates new Decentraland scene.')
  .option(
  '-p, --path <path>',
  'Output path (default is the current working directory).'
  )
  .option('--boilerplate', 'Include sample scene.')
  .action(async function (args: any, callback: () => void) {
    const self = this;

    const isDclProject = await fs.pathExists('./scene.json');
    if (isDclProject) {
      self.log('Project already exists!');
      callback();
    }

    const sceneMeta: DCL.SceneMetadata = {
      display: {
        title: 'My Land',
        favicon: 'favicon_asset'
      },
      owner: '',
      contact: {
        name: '',
        email: ''
      },
      main: 'scene',
      tags: [],
      scene: {
        base: '',
        parcels: []
      },
      communications: {
        type: 'webrtc',
        signalling: 'https://signalling-01.decentraland.org'
      },
      policy: {
        contentRating: 'E',
        fly: 'yes',
        voiceEnabled: 'yes',
        blacklist: [],
        teleportPosition: ''
      }
    };

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

    sceneMeta.communications.type = await prompt(self, chalk.blue(' type: '));
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
  });

/**
 * `start` command for starting local development server.
 */
cli
  .command('start')
  .alias('serve')
  .description('Starts local development server.')
  .action(function (args: string, callback: () => void) {
    start.bind(cli)(args, this, callback);
  });

/**
 * `upload` command for uploading scene to IPFS.
 */
cli
  .command('upload')
  .description('Uploads scene to IPFS and updates IPNS.')
  .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
  .action(async function (args: any, callback: () => void) {
    const self = this;

    // You need to have ipfs daemon running!
    const ipfsApi = ipfsAPI('localhost', args.options.port || '5001');

    let projectName = 'dcl-app';

    if (isDev) {
      await self
        .prompt({
          type: 'input',
          name: 'projectName',
          default: 'dcl-app',
          message: '(Development-mode) Project name you want to upload: '
        })
        .then((res: any) => (projectName = res.projectName));
    }

    const root = isDev ? `tmp/${projectName}` : '.';

    const isDclProject = await fs.pathExists(`${root}/scene.json`);
    if (!isDclProject) {
      self.log(
        `Seems like this is not a Decentraland project! ${chalk.grey(
          '(\'scene.json\' not found.)'
        )}`
      );
      callback();
    }

    const data = [
      {
        path: `tmp/scene.html`,
        content: new Buffer(fs.readFileSync(`${root}/scene.html`))
      },
      {
        path: `tmp/scene.json`,
        content: new Buffer(fs.readFileSync(`${root}/scene.json`))
      }
    ];

    // Go through project folders and add files if available
    await fs.readdir(`${root}/audio`).then(files =>
      files.forEach(name =>
        data.push({
          path: `tmp/audio/${name}`,
          content: new Buffer(fs.readFileSync(`${root}/audio/${name}`))
        })
      )
    );
    await fs.readdir(`${root}/models`).then(files =>
      files.forEach(name =>
        data.push({
          path: `tmp/models/${name}`,
          content: new Buffer(fs.readFileSync(`${root}/models/${name}`))
        })
      )
    );
    await fs.readdir(`${root}/textures`).then(files =>
      files.forEach(name =>
        data.push({
          path: `tmp/textures/${name}`,
          content: new Buffer(fs.readFileSync(`${root}/textures/${name}`))
        })
      )
    );

    let progCount = 0;
    let accumProgress = 0;
    const handler = (p: any) => {
      progCount += 1;
      accumProgress += p;
      // self.log(`${progCount}, ${accumProgress}`)
    };

    let ipfsHash;

    try {
      const filesAdded = await ipfsApi.files.add(data, {
        progress: handler,
        recursive: true
      });

      const rootFolder = filesAdded[filesAdded.length - 1];
      ipfsHash = `/ipfs/${rootFolder.hash}`;
      self.log('');
      self.log(`Uploading ${progCount}/${progCount} files to IPFS. done! ${accumProgress} bytes uploaded.`);
      self.log(`IPFS Folder Hash: ${ipfsHash}`);
      // TODO: pinning --- ipfs.pin.add(hash, function (err) {})

      self.log('Updating IPNS reference to folder hash... (this might take a while)');

      const publishResult = await ipfsApi.name.publish(ipfsHash);

      const ipnsHash = publishResult.name || publishResult.Name;
      self.log(`IPNS Link: /ipns/${publishResult.name || publishResult.Name}`);

      await fs.outputFile(`${root}/.decentraland/ipns`, ipnsHash);
    } catch (err) {
      self.log(err.message);
    }

    callback();
  });

/**
 * `link` command for linking IPNS hash to Ethereum.
 */
cli
  .command('link')
  .description('Link scene to Ethereum.')
  .action(function (args: any, callback: () => void) {
    const self = this;

    linker.bind(cli)(args, this, callback);
  });

cli.delimiter(DELIMITER).show();

// If one or more command, execute and close
if (process.argv.length > 2) {
  cli.parse(process.argv);
} else {
  // Enters immersive mode if no commands supplied
  cli.log(`Decentraland CLI v${VERSION}\n`);
  cli.log('Type "exit" to quit, "help" for a list of commands.\n');
}

module.exports = cli;
