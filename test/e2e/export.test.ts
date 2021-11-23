import path from 'path'
import test from 'ava'

import * as exportCmd from '../../src/commands/export'
import { isDebug } from '../../src/utils/env'
import pathsExistOnDir from '../../src/utils/pathsExistOnDir'
import Commando from '../helpers/commando'
import sandbox from '../helpers/sandbox'
import initProject from '../helpers/initProject'
import buildProject from '../helpers/buildProject'

test('snapshot - dcl help export', (t) => {
  t.snapshot(exportCmd.help())
})

function exportProject(dirPath) {
  return new Promise<void>((resolve) => {
    new Commando(`node ${path.resolve('dist', 'cli.js')} export`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    })
      .endWhen(/Export successful./)
      .on('end', async () => {
        resolve()
      })
  })
}

test('E2E - export command', async (t) => {
  await sandbox(async (dirPath, done) => {
    await initProject(dirPath)
    await buildProject(dirPath)
    await exportProject(dirPath)
    const [htmlExists, , previewExists, sceneExists] = await pathsExistOnDir(
      path.resolve(dirPath, 'export'),
      [
        'index.html',
        'preview.js',
        'scene.json',
        'bin/game.js',
        'unity',
        'images/progress-logo.png'
      ]
    )

    t.true(htmlExists)
    t.true(previewExists)
    t.true(sceneExists)

    done()
  })
})
