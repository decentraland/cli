import { spawn } from 'child_process'
import { npm } from '../utils/moduleHelpers'

export function upgrade(vorpal: any) {
  vorpal
    .command('upgrade')
    .description('Update the Decentraland CLI tools')
    .action(function(args: any, callback: () => void) {
      const child = spawn(npm, ['install', '-g', '--upgrade', 'decentraland'], { shell: true })
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)
      child.on('close', callback)
    })
}
