import chalk from 'chalk';
import fs = require('fs-extra');
import inquirer = require('inquirer');
const ipfsAPI = require('ipfs-api');
import { getRoot } from './get-root';
import { getIPFSURL } from './get-ipfs-url';
import axios from 'axios';
import { env } from 'decentraland-commons';
import path = require('path');

env.load();

export async function uploader(vorpal: any, args: any, callback: () => void) {
  // If it is the first time, not pin the scene to Decentraland IPFS node
  let isUpdate = true;

  // You need to have ipfs daemon running!
  const ipfsApi = ipfsAPI('localhost', args.options.port || '5001');

  const root = getRoot();

  const isDclProject = await fs.pathExists(path.join(root, 'scene.json'));
  if (!isDclProject) {
    vorpal.log(`Seems like this is not a Decentraland project! ${chalk.grey(`('scene.json' not found.)`)}`);
    callback();
    return;
  }

  const data = [
    {
      path: `tmp/scene.html`,
      content: new Buffer(fs.readFileSync(path.join(root, 'scene.html')))
    },
    {
      path: `tmp/scene.json`,
      content: new Buffer(fs.readFileSync(path.join(root, 'scene.json')))
    }
  ];

  // Go through project folders and add files if available
  ['audio', 'models', 'textures'].forEach(async (type: string) => {
    const folder = await fs.readdir(path.join(root, type));
    folder.forEach((name: string) =>
      data.push({
        path: `tmp/${type}/${name}`,
        content: new Buffer(fs.readFileSync(path.join(root, type, name)))
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
      recursive: true
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
          y: parseInt(y, 10)
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
