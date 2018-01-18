import chalk from 'chalk';
import fs = require('fs-extra');
import Koa = require('koa');
import Router = require('koa-router');
import serve = require('koa-static');
import * as project from './project';
import { isDev } from './is-dev';
import { prompt } from './prompt';

export async function linker(vorpal: any, args: any, callback: () => void) {
  const path = isDev ? './tmp/' : '.';

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

  const app = new Koa();
  const router = new Router();

  app.use(serve(`${path}/.decentraland/linker-app`));

  router.get('/api/get-scene-data', async (ctx) => {
    ctx.body = await fs.readJson(`${path}/scene.json`);
  });

  router.get('/api/get-ipns-hash', async (ctx) => {
    const ipnsHash = await fs.readFile(`${path}/.decentraland/ipns`, 'utf8');
    ctx.body = JSON.stringify(ipnsHash);
  });

  router.get('*', async (ctx) => {
    ctx.respond = false;
  });

  app.use(async (ctx, next) => {
    ctx.res.statusCode = 200;
    await next();
  });

  app.use(router.routes());

  vorpal.log('Linking app ready.');
  vorpal.log(`Please proceed to ${chalk.blue('http://localhost:4044/linker')}.`);

  await app.listen(4044);
}
