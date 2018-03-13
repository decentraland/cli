import { uploader } from '../utils/uploader';
import { linker } from '../utils/linker';
import { wrapAsync } from '../utils/wrap-async';
import { deploy } from '../utils/analytics';

export function upload(vorpal: any) {
  vorpal
  .command('upload')
  .description('Uploads scene to IPFS and updates IPNS.')
  .option('-p, --port <number>', 'IPFS daemon API port (default is 5001).')
  .action(wrapAsync(async function (args: any, callback: () => void) {
    deploy();
    await uploader(vorpal, args, callback);
    callback();
  }));
}
