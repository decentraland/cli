import chalk from 'chalk';
import fs = require('fs-extra');
import inquirer = require('inquirer');
const ipfsAPI = require('ipfs-api');
import { getRoot } from './get-root';
import { getIPFSURL } from './get-ipfs-url';
import axios from 'axios';
import { env } from 'decentraland-commons';
import path = require('path');
const parser = require('gitignore-parser');

env.load();

export async function uploader(vorpal: any, args: any, callback: () => void) {
  // If it is the first time, not pin the scene to Decentraland IPFS node
  let isUpdate = true;

  const exitWithError = (message: string) => {
    vorpal.log(message);
    callback();
    return;
  };

  // You need to have ipfs daemon running!
  const ipfsApi = ipfsAPI('localhost', args.options.port || '5001');

  const root = getRoot();

  try {
    const scene = JSON.parse(fs.readFileSync(path.join(root, 'scene.json'), 'utf-8'));
    const supportedExtensions = ['js', 'html', 'xml'];
    const mainExt = scene.main.split('.').pop();
    const isWebSocket = (str: string) => /(ws(s?))\:\/\//gi.test(str);
    const isInvalidFormat = !supportedExtensions.filter(ext => ext === mainExt).length;
    const mainExists = fs.existsSync(path.join(root, scene.main));

    if (!isWebSocket(scene.main)) {
      if (isInvalidFormat) return exitWithError(`Main scene format file (${scene.main}) is not a supported format`);
      if (!mainExists) return exitWithError(`Main scene file ${scene.main} is missing`);
    }
  } catch (error) {
    vorpal.log(`Seems like this is not a Decentraland project! ${chalk.grey(`('scene.json' not found.)`)}`);
    callback();
    return;
  }

  const data: object[] = [];

  // Go through project folders and add files if not ignored
  const dclignore = parser.compile(fs.readFileSync(path.join(root, '.dclignore'), 'utf8'));

  const getFiles = (dir: string): string[] =>
    fs
      .readdirSync(dir)
      .reduce(
        (files, file) =>
          fs.statSync(path.join(dir, file)).isDirectory()
            ? files.concat(getFiles(path.join(dir, file)))
            : files.concat(path.join(dir, file)),
        [],
      )
      .map(file => path.relative(root, file));

  const files: string[] = getFiles(root);

  // Go through project folders and add files if available
  files.filter(dclignore.accepts).forEach(async (name: string) =>
    data.push({
      path: `/tmp/${name}`,
      content: new Buffer(fs.readFileSync(name)),
    }),
  );

  let progCount = 0;
  let accumProgress = 0;
  const handler = (p: any) => {
    progCount += 1;
    accumProgress += p;
    // vorpal.log(`${progCount}, ${accumProgress}`)
  };

  // generate an ipfs private key for this project if it doesn't have any yet
  let project;
  try {
    project = JSON.parse(fs.readFileSync(path.join(root, '.decentraland', 'project.json'), 'utf-8'));
  } catch (error) {
    vorpal.log(chalk.red('Could not find `.decentraland/project.json`'));
    process.exit(1);
  }

  // Get ipfs node peer ID
  if (project.peerId == null) {
    vorpal.log('Getting IPFS node peer ID...');
    const { id } = await ipfsApi.id();
    project.peerId = id;
    vorpal.log(`Peer ID: ${JSON.stringify(project.peerId)}`);
    fs.outputFileSync(path.join(root, '.decentraland', 'project.json'), JSON.stringify(project, null, 2));
  }

  if (project.ipfsKey == null) {
    vorpal.log('Generating IPFS key...');
    isUpdate = false;
    const { id } = await ipfsApi.key.gen(project.id, { type: 'rsa', size: 2048 });
    project.ipfsKey = id;
    vorpal.log(`New IPFS key: ${project.ipfsKey}`);
    fs.outputFileSync(path.join(root, '.decentraland', 'project.json'), JSON.stringify(project, null, 2));
  }

  let ipfsHash;
  let ipnsHash;

  try {
    const filesAdded = await ipfsApi.files.add(data, {
      progress: handler,
      recursive: true,
    });

    const rootFolder = filesAdded[filesAdded.length - 1];
    ipfsHash = `/ipfs/${rootFolder.hash}`;
    vorpal.log('');
    vorpal.log(`Uploading ${progCount}/${progCount} files to IPFS. done! ${accumProgress} bytes uploaded.`);
    vorpal.log(`IPFS Folder Hash: ${ipfsHash}`);
    // TODO: pinning --- ipfs.pin.add(hash, function (err) {})
    vorpal.log('Updating IPNS reference to folder hash... (this might take a while)');
    const { name } = await ipfsApi.name.publish(ipfsHash, { key: project.id });

    vorpal.log(`IPNS Link: /ipns/${name}`);
  } catch (err) {
    vorpal.log(err.message);
    if (err.message.indexOf('ECONNREFUSED') != -1) {
      vorpal.log(chalk.red('\nMake sure you have the IPFS daemon running (https://ipfs.io/docs/install/).'));
    }
    process.exit(1);
  }

  if (isUpdate) {
    vorpal.log('Pinning Files to Decentraland IPFS node... (this might take a while)');
    const coordinates: any = [];
    try {
      const sceneMetadata = JSON.parse(fs.readFileSync(path.join(root, 'scene.json'), 'utf-8'));
      sceneMetadata.scene.parcels.forEach((parcel: any) => {
        const [x, y] = parcel.split(',');

        coordinates.push({
          x: parseInt(x, 10),
          y: parseInt(y, 10),
        });
      });
    } catch (err) {
      vorpal.log('Error', JSON.stringify(err.message));
      process.exit(1);
    }

    let ipfsURL: string = await getIPFSURL();
    try {
      const { ok } = await axios
        .get(`${ipfsURL}/pin/${project.peerId}/${coordinates[0].x}/${coordinates[0].y}`)
        .then(response => response.data);

      vorpal.log(`Pinning files ${ok ? 'success' : 'failed'}`);
    } catch (err) {
      vorpal.log('Error', JSON.stringify(err.message));
      process.exit(1);
    }
  }

  return ipnsHash;
}
