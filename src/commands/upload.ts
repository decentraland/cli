import chalk from 'chalk';
import fs = require('fs-extra');
const ipfsAPI = require('ipfs-api');
import { isDev } from '../utils/is-dev';

export function upload(vorpal: any) {
  vorpal
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
}
