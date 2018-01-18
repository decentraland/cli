import chalk from 'chalk';
import fs = require('fs-extra');
import inquirer = require('inquirer');
const ipfsAPI = require('ipfs-api');
import * as project from '../utils/project';
import { cliPath }from '../utils/cli-path';
import { isDev } from '../utils/is-dev';

export async function uploader(vorpal: any, args: any, callback: () => void) {
  // You need to have ipfs daemon running!
  const ipfsApi = ipfsAPI('localhost', args.options.port || '5001');

  let projectName = project.getDefaultName();

  if (isDev) {
    projectName = await prompt('(Development-mode) Project name you want to upload: ', projectName);
  }

  const root = isDev ? `tmp/${projectName}` : '.';

  const isDclProject = await fs.pathExists(`${root}/scene.json`);
  if (!isDclProject) {
    vorpal.log(
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
  ['audio', 'models', 'textures'].forEach(async (type: string) => {
    const folder = await fs.readdir(`${root}/${type}`);
    folder.forEach((name: string) =>
      data.push({
        path: `tmp/${type}/${name}`,
        content: new Buffer(fs.readFileSync(`${root}/${type}/${name}`))
      })
    );
  });

  let progCount = 0;
  let accumProgress = 0;
  const handler = (p: any) => {
    progCount += 1;
    accumProgress += p;
    // vorpal.log(`${progCount}, ${accumProgress}`)
  };

  let ipfsHash;

  try {
    const filesAdded = await ipfsApi.files.add(data, {
      progress: handler,
      recursive: true
    });

    const rootFolder = filesAdded[filesAdded.length - 1];
    ipfsHash = `/ipfs/${rootFolder.hash}`;
    vorpal.log('');
    vorpal.log(`Uploading ${progCount}/${progCount} files to IPFS. done! ${accumProgress} bytes uploaded.`);
    vorpal.log(`IPFS Folder Hash: ${ipfsHash}`);
    // TODO: pinning --- ipfs.pin.add(hash, function (err) {})

    vorpal.log('Updating IPNS reference to folder hash... (this might take a while)');

    const publishResult = await ipfsApi.name.publish(ipfsHash);

    const ipnsHash = publishResult.name || publishResult.Name;
    vorpal.log(`IPNS Link: /ipns/${publishResult.name || publishResult.Name}`);

    await fs.outputFile(`${root}/.decentraland/ipns`, ipnsHash);
  } catch (err) {
    vorpal.log(err.message);
  }
}
