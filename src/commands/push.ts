import { uploader } from '../utils/uploader';
import { linker } from '../utils/linker';
import { wrapAsync } from '../utils/wrap-async';

export function push(vorpal: any) {
  vorpal
    .command('push')
    .description('Upload, link IPNS, and link Ethereum in one go.')
    .action(wrapAsync( async function(args: any, callback: () => void) {
      await uploader(vorpal, args, callback);
      await linker(vorpal, args, callback);
      callback();
    }));
}
