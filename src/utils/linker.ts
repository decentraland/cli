import chalk from 'chalk';
import fs = require('fs-extra');
import Koa = require('koa');
import Router = require('koa-router');
import serve = require('koa-static');
import axios from 'axios';
import { env } from 'decentraland-commons';
import * as project from '../utils/project';
import opn = require('opn');
import { readFile } from './filesystem';
import { getRoot } from './get-root';
import { getIPFSURL } from './get-ipfs-url';
import { cliPath } from './cli-path';
import { sceneLink, sceneLinkSuccess } from './analytics';
import * as urlParse from 'url';
import path = require('path');

export async function linker(vorpal: any, args: any, callback: () => void) {
  const root = getRoot();
  const isDclProject = await fs.pathExists(path.join(root, 'scene.json'));
  if (!isDclProject) {
    vorpal.log(`Seems like this is not a Decentraland project! ${chalk.grey(`('scene.json' not found.)`)}`);
    callback();
    return;
  }

  vorpal.log(chalk.blue('\nConfiguring linking app...\n'));

  env.load();

  let project: any;
  try {
    project = await getProject();
  } catch (error) {
    vorpal.log(chalk.red('Could not find `.decentraland/project.json`'));
    process.exit(1);
  }
  const { ipfsKey, peerId } = project;
  const ipfsURL = await getIPFSURL();

  sceneLink({ ipfsURL, ipfsKey, peerId });

  const app = new Koa();
  const router = new Router();

  app.use(serve(path.join(cliPath, 'dist', 'linker-app')));

  async function getProject(): Promise<any> {
    return JSON.parse(await readFile(path.join(root, '.decentraland', 'project.json'), 'utf-8'));
  }

  router.get('/api/get-scene-data', async ctx => {
    ctx.body = await fs.readJson(path.join(root, 'scene.json'));
  });

  router.get('/api/get-ipfs-key', async ctx => {
    ctx.body = JSON.stringify(project.ipfsKey);
  });

  router.get('/api/get-ipfs-peerid', async ctx => {
    ctx.body = JSON.stringify(project.peerId);
  });

  router.get('/api/contract-address', async ctx => {
    let LANDRegistryAddress: string = null;

    try {
      const { data } = await axios.get('https://contracts.decentraland.org/addresses.json');
      LANDRegistryAddress = data.mainnet.LANDProxy;
    } catch (error) {
      // fallback to ENV
    }

    LANDRegistryAddress = env.get('LAND_REGISTRY_CONTRACT_ADDRESS', () => LANDRegistryAddress);

    ctx.body = JSON.stringify({
      address: LANDRegistryAddress
    });
  });

  router.get('/api/pin-files/:peerId/:x/:y', async ctx => {
    const { peerId, x, y } = ctx.params;

    const { ok, message } = await axios
      .get(`${ipfsURL}/pin/${peerId}/${x}/${y}`)
      .then(response => response.data)
      .catch(error => ({ ok: false, message: error.message }));
    ctx.body = JSON.stringify({ ok, message });
  });

  router.get('/api/close', async ctx => {
    ctx.res.end();
    sceneLinkSuccess({ ipfsURL, ipfsKey, peerId });

    const ok = urlParse.parse(ctx.req.url, true).query.ok;
    if (ok === 'true') {
      vorpal.log(chalk.green('\nThe project was linked to Ethereum!'));
    } else {
      vorpal.log(chalk.red('\nThe project was not linked to Ethereum'));
    }
    process.exit(0);
  });

  router.get('*', async ctx => {
    ctx.respond = false;
  });

  app.use(async (ctx, next) => {
    ctx.res.statusCode = 200;
    await next();
  });

  app.use(router.routes());

  const url = 'http://localhost:4044/linker';
  vorpal.log('Linking app ready.');
  vorpal.log(`Please proceed to ${chalk.blue(url)}`);
  await app.listen(4044, () => opn(url));
}
