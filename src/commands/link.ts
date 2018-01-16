import { linker } from '../utils/linker';

export function link(vorpal: any) {
  vorpal
    .command('link')
    .description('Link scene to Ethereum.')
    .action(function (args: any, callback: () => void) {
      const self = this;

      linker.bind(vorpal)(args, this, callback);
    });
}
