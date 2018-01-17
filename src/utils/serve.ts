import chalk from 'chalk';
import { isDev } from '../utils/is-dev';
const liveServer = require('live-server');

export function serve(vorpal: any, args: any, ): void {
  vorpal.log(chalk.blue('Parcel server is starting...\n'));
  const dir = isDev ? './tmp/dcl-app' : '.';
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
