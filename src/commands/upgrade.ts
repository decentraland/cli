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
        try {
          await uninstall()
        } catch (e) {
          fail(ErrorType.UPGRADE_ERROR, `Failed to uninstall current version: ${e.message}`)
        }

        try {
          await install()
        } catch (e) {
          if (e.errno === 'EPERM') {
            fail(ErrorType.UPGRADE_ERROR, 'Failed to install new version: please try running this command again as root/Administrator')
          } else {
            fail(ErrorType.UPGRADE_ERROR, `Failed to install new version: ${e.message}`)
          }
        }
        success('All packages updated successfully')
      })
    )
}
