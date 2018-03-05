import chalk from 'chalk';
import fs = require('fs-extra');
import Koa = require('koa');
import Router = require('koa-router');
import serve = require('koa-static');
import axios from 'axios';
import { env } from 'decentraland-commons';
import * as project from '../utils/project';
import { prompt } from './prompt';
import opn = require('opn');
import { getRoot } from './get-root';

export async function linker(vorpal: any, args: any, callback: () => void) {
  const path = getRoot()

  const isDclProject = await fs.pathExists(`${path}/scene.json`);
  if (!isDclProject) {
    vorpal.log(`Seems like this is not a Decentraland project! ${chalk.grey('(\'scene.json\' not found.)')}`);
    callback();
    return;
  }

  const hasLinker = await fs.pathExists(
    `${path}/.decentraland/linker-app/linker/index.html`
  );

  if (!hasLinker) {
    vorpal.log(`Looks like linker app is missing. Try to re-initialize your project.`);
    callback();
    return;
  }

  vorpal.log(chalk.blue('\nConfiguring linking app...\n'));

  env.load();

  const app = new Koa();
  const router = new Router();

  app.use(serve(`${path}/.decentraland/linker-app`));

  router.get('/api/get-scene-data', async (ctx) => {
    ctx.body = await fs.readJson(`${path}/scene.json`);
  });

  router.get('/api/get-ipfs-key', async (ctx) => {
    let project
    try {
      project = JSON.parse(fs.readFileSync(`${path}/.decentraland/project.json`, 'utf-8'))
    } catch (error) {
      vorpal.log(chalk.red('Could not find `.decentraland/project.json`'))
      process.exit(1)
    }
    ctx.body = JSON.stringify(project.ipfsKey);
  });

  router.get('/api/get-ipfs-peerid', async (ctx) => {
    let project
    try {
      project = JSON.parse(fs.readFileSync(`${path}/.decentraland/project.json`, 'utf-8'))
    } catch (error) {
      vorpal.log(chalk.red('Could not find `.decentraland/project.json`'))
      process.exit(1)
    }
    ctx.body = JSON.stringify(project.peerId);
  });

  router.get('/api/contract-address', async (ctx) => {
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

  router.get('/api/pin-files/:peerId/:x/:y', async (ctx) => {
    const { peerId, x, y } = ctx.params;
    let ipfsURL: string = null;
    try {
      const { data } = await axios.get('https://decentraland.github.io/ipfs-node/url.json');
      ipfsURL = data.staging;
    } catch (error) {
      // fallback to ENV
    }

    const url = env.get('IPFS_GATEWAY', () => ipfsURL);
    const { ok, message } = await axios.get(`${url}/pin/${peerId}/${x}/${y}`)
      .then(response => response.data)
      .catch(error => ({ 'ok': false, message: error.message }));
    ctx.body = JSON.stringify({ ok, message });
  });

  router.get('/api/close', async (ctx) => {
    ctx.res.end();
    const ok = require('url').parse(ctx.req.url, true).query.ok;
    if (ok === 'true') {
      vorpal.log(chalk.green('\nThe project was linked to Ethereum!'));
    } else {
      vorpal.log(chalk.red('\nThe project was not linked to Ethereum'));
    }
    process.exit(0);
  });

  router.get('*', async (ctx) => {
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
