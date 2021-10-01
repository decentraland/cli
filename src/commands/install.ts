import * as arg from 'arg'
import chalk from 'chalk'
import updateBundleDependenciesField from '../project/updateBundleDependenciesField'
import { spawn } from 'child_process'
import { npm } from './../utils/moduleHelpers'
import * as spinner from '../utils/spinner'

export const help = () => `
  Usage: ${chalk.bold('dcl install [package]')}

    ${chalk.dim('Options:')}

      -h, --help               Displays complete help

    ${chalk.dim('Examples:')}

    - Install a new package

      ${chalk.green('$ dcl install package-example')}

    - Check the Decentraland libraries used are in bundleDependencies

      ${chalk.green('$ dcl install')}
`

const spawnNpmInstall = (args: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    spinner.create(`npm ${args.join(' ')}\n`)

    const child = spawn(npm, args, {
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: '' }
    })

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.on('close', code => {
      if (code !== 0) {
        spinner.fail()
        reject(
          new Error(
            `${chalk.bold(
              `npm ${args.join(' ')}`
            )} exited with code ${code}. Please try running the command manually`
          )
        )
      } else {
        spinner.succeed()
        resolve()
      }
    })
  })
}

export async function main() {
  const args = arg({
    '--help': Boolean,
    '-h': '--help'
  })

  await spawnNpmInstall(args._)

  await updateBundleDependenciesField()
}
