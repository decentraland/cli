import chalk from "chalk";
//import path = require("path");
//const { getInstalledPathSync } = require('get-installed-path')
//import isDev from "./is-dev";
const nextConfig = require("../../next.config");
const express = require('express');
const next = require('next');

// const cliPath = getInstalledPathSync('dcl-cli')
// console.log(cliPath)
// console.log(`${cliPath}/dist`)

const app = next({ quiet: true, conf: nextConfig })
const handle = app.getRequestHandler()

export default function(args: any, vorpal: any, callback: () => void): void {
  vorpal.log(chalk.blue("\nConfiguring linking app...\n"));

  app.prepare().then(() => {
    const server = express();

    server.get('/linker', (req: any, res: any) => {
      return app.render(req, res, '/linker', req.query)
    });

    server.get('/linking-finished', (req: any, res: any) => {
      // TODO: show confirmation in terminal
    });

    server.get('*', (req: any, res: any) => {
      return handle(req, res)
    });

    server.listen(4044, (err: Error) => {
      if (err) throw err
      vorpal.log("Linking app ready.")
      vorpal.log(`Please proceed to link: ${chalk.blue("http://localhost:4044/linker")}.`);
    });
  })
}
