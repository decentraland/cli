import path from 'path'
import fs from 'fs-extra'
import test from 'ava'

import * as buildCmd from '../../src/commands/build'
import { isDebug } from '../../src/utils/env'
import Commando from '../helpers/commando'
import sandbox from '../helpers/sandbox'
import initProject from '../helpers/initProject'

test('snapshot - dcl help build', (t) => {
  t.snapshot(buildCmd.help())
})

function buildProject(dirPath) {
  return new Promise<void>((resolve) => {
    new Commando(
      `node ${path.resolve('dist', 'index.js')} build --skip-version-checks`,
      {
        silent: !isDebug(),
        workingDir: dirPath,
        env: { NODE_ENV: 'development' }
      }
    )
      .endWhen(/Project built/)
      .on('end', async () => {
        resolve()
      })
  })
}

test('build command', async (t) => {
  await sandbox(async (dirPath, done) => {
    await initProject(dirPath)
    await buildProject(dirPath)
    const gameExists = await fs.pathExists(
      path.resolve(dirPath, 'bin', 'game.js')
    )
    t.true(gameExists)
    done()
  })
})
