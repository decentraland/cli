import chalk from "chalk";
import fs = require("fs-extra");
const Koa = require('koa');
const Router = require('koa-router');
const serve = require('koa-static');
import isDev from "../utils/is-dev";

export default async (args: any, vorpal: any, callback: () => void) => {
  let projectName = "dcl-app";

  if (isDev) {
    await vorpal
      .prompt({
        type: "input",
        name: "projectName",
        default: "dcl-app",
        message: "(Development-mode) Project name you want to upload: "
      })
      .then((res: any) => (projectName = res.projectName));
  }

  const root = isDev ? `tmp/${projectName}` : ".";

  const isDclProject = await fs.pathExists(`${root}/scene.json`);
  if (!isDclProject) {
    vorpal.log(
      `Seems like this is not a Decentraland project! ${chalk.grey(
        "('scene.json' not found.)"
      )}`
    );
    callback();
  }

  const hasLinker = await fs.pathExists(`${root}/.decentraland/linker-app/linker/index.html`);
  if (!hasLinker) {
    vorpal.log(
      `Looks like linker app is missing. Try to re-initialize your project.`
    );
    callback();
  }

  vorpal.log(chalk.blue("\nConfiguring linking app...\n"));

  const app = new Koa();
  const router = new Router();

  app.use(serve(`${root}/.decentraland/linker-app`));

  router.get('/api/get-scene-data', async (ctx: any) => {
    ctx.body = await fs.readJson(`${root}/scene.json`)
  });

  router.get('/api/get-ipns-hash', async (ctx: any) => {
    const ipnsHash = await fs.readFile(`${root}/.decentraland/ipns`, "utf8");
    ctx.body = JSON.stringify(ipnsHash);
  });

  router.get('*', async (ctx: any) => {
    ctx.respond = false
  });

  app.use(async (ctx: any, next: () => void) => {
    ctx.res.statusCode = 200
    await next()
  });

  app.use(router.routes());

  vorpal.log("Linking app ready.");
  vorpal.log(`Please proceed to ${chalk.blue("http://localhost:4044/linker")}.`);

  await app.listen(4044);
}
