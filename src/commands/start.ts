import { serve } from '../utils/serve';

export function start(vorpal: any) {
  vorpal
    .command('start')
    .alias('serve')
    .description('Starts local development server.')
    .action(function (args: string, callback: () => void) {
      serve(vorpal, args);
    });
}
