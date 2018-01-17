import { wrapAsync } from '../utils/wrap-async';
import { upload } from '../commands/upload';
import { link } from '../commands/link';

export function push(vorpal: any) {
  vorpal
    .command('push')
    .description('Upload, link IPNS, and link Ethereum in one go.')
    .action(function(args: any, callback: () => void) {
      // vorpal.exec('upload').then(() => vorpal.exec('link'));
    });
}
