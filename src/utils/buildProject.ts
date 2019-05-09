import { spawn } from 'child_process'
import { isDebug } from './env'

const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

export default function buildProject(workingDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', 'build'], {
      shell: true,
      cwd: workingDir,
      env: { ...process.env, NODE_ENV: '' }
    })
    if (isDebug()) {
      child.stdout.pipe(process.stdout)
    }
    child.stderr.pipe(process.stderr)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error('Error while building the project'))
      } else {
        resolve()
      }
    })
  })
}
