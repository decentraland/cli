import { serve } from '../preview/serve';
const opn = require('opn');

export function start(vorpal: any) {
  vorpal
    .command('start')
    .alias('serve')
    .description('Starts local development server.')
    .action(function(args: string, callback: () => void) {
      serve(vorpal, args);
      opn('http://localhost:2044');
    });
}
