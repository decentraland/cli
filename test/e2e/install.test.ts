import path from 'path'
import test from 'ava'

import * as installCmd from '../../src/commands/install'
import sandbox from '../helpers/sandbox'
import initProject from '../helpers/initProject'
import Commando from '../helpers/commando'
import { isDebug } from '../../src/utils/env'
import { readJSON } from '../../src/utils/filesystem'

function installCommand(dirPath: string, library: string = '') {
  return new Promise<void>((resolve) => {
    const cmd = new Commando(
      `node ${path.resolve('dist', 'cli.js')} install ${library}`,
      {
        silent: !isDebug(),
        workingDir: dirPath,
        env: { NODE_ENV: 'development' }
      }
    )

    cmd.on('end', async () => {
      resolve()
    })
  })
}

test('snapshot - dcl help instal', (t) => {
  t.snapshot(installCmd.help())
})

test('E2E - install a package', async (t) => {
  await sandbox(async (dirPath, done) => {
    const packageToInstall = '@dcl/ecs-scene-utils'
    await initProject(dirPath)
    await installCommand(dirPath, packageToInstall)

    const packageJson = await readJSON<{ bundleDependencies: string[] }>(
      path.resolve(dirPath, 'package.json')
    )
    t.true(packageJson.bundleDependencies.includes(packageToInstall))
    done()
  })
})
