import { install, uninstall, isOnline, latestVersion } from '../utils/moduleHelpers'
import { wrapCommand } from '../utils/wrapCommand'
import { fail, ErrorType } from '../utils/errors'
import { success } from '../utils/logging'

export function upgrade(vorpal: any) {
  vorpal
    .command('upgrade')
    .alias('update')
    .description('Update the Decentraland CLI tools')
    .action(
      wrapCommand(async function(args: any) {
        if (!(await isOnline())) {
          fail(ErrorType.UPGRADE_ERROR, 'Unable to upgrade: no internet connection')
        }

        vorpal.log('Updating to decentraland@' + (await latestVersion('decentraland')))
        await uninstall()
        await install()
        success('All packages updated successfully')
      })
    )
}
