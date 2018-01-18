import chalk from 'chalk';
import { isDev } from '../utils/is-dev';
import * as fs from 'fs';
const liveServer = require('live-server');

export function serve(vorpal: any, args: any, ): void {
  vorpal.log(chalk.blue('Parcel server is starting...\n'));
  let dir = '.'
  if (isDev) {
    try {
      dir = `./tmp/${fs.readdirSync('./tmp')[0]}`
    } catch (e) {
      // this happens only in dev mode when you run `dcl serve` without running `dcl init` first
      console.error('Project not initialized!') 
      return
    }
  }
  liveServer.start({
    port: 2044,
    host: '0.0.0.0',
    root: dir,
    open: true,
    ignore: '.decentraland',
    file: 'scene.html',
    wait: 500,
    logLevel: 3
  });
}
