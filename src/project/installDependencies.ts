import { spawn } from 'child_process'
import chalk from 'chalk'

import * as spinner from '../utils/spinner'
import { npm } from '../utils/moduleHelpers'

export default function installDependencies(workingDir: string, silent: boolean): Promise<void> {
  spinner.create('Installing dependencies')
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['install'], {
      shell: true,
      cwd: workingDir,
      env: { ...process.env, NODE_ENV: '' }
    })

    if (!silent) {
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)
    }

    child.on('close', code => {
      if (code !== 0) {
        spinner.fail()
        reject(
          new Error(
            `${chalk.bold(
              `npm install`
            )} exited with code ${code}. Please try running the command manually`
          )
        )
      }

      spinner.succeed('Dependencies installed.')
      resolve()
    })
  })
}
