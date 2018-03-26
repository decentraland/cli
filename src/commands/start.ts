import fs = require('fs-extra');
import { serve } from '../preview/serve';
import { wrapAsync } from '../utils/wrap-async';
import { buildTypescript } from '../utils/module-helpers';
const opn = require('opn');

export function start(vorpal: any) {
  vorpal
    .command('preview')
    .alias('start')
    .alias('serve')
    .description('Starts local development server.')
    .action(function(args: any, callback: () => void) {
      const files = fs.readdirSync(process.cwd());

      if (files.find(file => file === 'tsconfig.json')) {
        buildTypescript().then(() => {
          startServer(vorpal, args);
        });
      } else {
        startServer(vorpal, args);
      }
    });
}

export function startServer(vorpal: any, args: any[]) {
  serve(vorpal, args);
  opn('http://localhost:2044');
}
