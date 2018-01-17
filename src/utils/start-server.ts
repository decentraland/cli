import chalk from 'chalk';
import isDev from './is-dev';
const budo = require('budo');

export default function (args: any, vorpal: any, callback: () => void): void {
  vorpal.log(chalk.blue('Parcel server is starting...\n'));
  const baseDir = isDev ? './tmp/dcl-app' : '.'
  budo('.', {
    host: '0.0.0.0',
    live: baseDir + '**/*',
    dir: baseDir,
    port: 2044,
    stream: process.stdout,
    staticOptions: {
      index: 'scene.html'
    }
  });
}
