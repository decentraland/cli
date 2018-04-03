import chalk from 'chalk';
import fs = require('fs-extra');
import Koa = require('koa');
import Router = require('koa-router');
import serve = require('koa-static');
import axios from 'axios';
import { env } from 'decentraland-commons/dist/env';
import * as project from '../utils/project';
import opn = require('opn');
import { readFile } from './filesystem';
import { getRoot } from './get-root';
import { pinFiles } from './pin-files';
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

  sceneLink({ ipfsKey, peerId });

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
    try {
      await pinFiles(peerId, { x, y });
      ctx.body = JSON.stringify({ ok: true });
    } catch (e) {
      ctx.body = JSON.stringify({ error: e.message });
    }
  });

  router.get('/api/close', async ctx => {
    ctx.res.end();
    const { ok, reason } = urlParse.parse(ctx.req.url, true).query;
    if (ok === 'true') {
      sceneLinkSuccess({ ipfsKey, peerId });
      vorpal.log(chalk.green('\nThe project was pinned & linked to Ethereum!'));
    } else {
      vorpal.log(chalk.red(`\nFailed: ${reason}`));
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
