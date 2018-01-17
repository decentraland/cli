import chalk from 'chalk';
const budo = require('budo');

export function serve(vorpal: any, args: any, ): void {
  vorpal.log(chalk.blue('Parcel server is starting...\n'));

  budo('./', {
    host: '0.0.0.0',
    live: true,
    port: 2044,
    stream: process.stdout
  });
}
