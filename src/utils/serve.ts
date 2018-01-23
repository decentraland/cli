import chalk from 'chalk';
import { getRoot } from './get-root';
const liveServer = require('live-server');

export function serve(vorpal: any, args: any, ): void {
  vorpal.log(chalk.blue('Parcel server is starting...\n'));

  liveServer.start({
    port: 2044,
    host: '0.0.0.0',
    root: getRoot(),
    open: true,
    ignore: '.decentraland',
    file: 'scene.html',
    wait: 500,
    logLevel: 3
  });
}
