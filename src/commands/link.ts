import { linker } from '../utils/linker';

export function link(vorpal: any) {
  vorpal
    .command('link')
    .description('Link scene to Ethereum.')
    .action(function (args: any, callback: () => void) {
      linker(vorpal, args, callback);
    });
}
