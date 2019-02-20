import * as fs from 'fs-extra'
import * as path from 'path'
import test from 'ava'

import { SceneMetadata } from '../../src/lib/Project'
import * as init from '../../src/commands/init'
import sandbox from '../helpers/sandbox'
import pathsExistOnDir from '../../src/utils/pathsExistOnDir'
import initProject from '../helpers/initProject'

test('snapshot - dcl help init', t => {
  t.snapshot(init.help())
})

test('E2E - init command', async t => {
  await sandbox(async (dirPath, done) => {
    await initProject(dirPath)

    const [
      gameExists,
      sceneExists,
      packageExists,
      nodeModulesExists,
      dclIgnoreExists,
      ecsModuleExist
    ] = await pathsExistOnDir(dirPath, [
      'src/game.ts',
      'scene.json',
      'package.json',
      'node_modules',
      '.dclignore',
      'node_modules/decentraland-ecs'
    ])

    t.true(gameExists)
    t.true(sceneExists)
    t.true(packageExists)
    t.true(nodeModulesExists)
    t.true(dclIgnoreExists)
    t.true(ecsModuleExist)

    const [sceneFile, expected]: SceneMetadata[] = await Promise.all([
      fs.readJson(path.resolve(dirPath, 'scene.json')),
      fs.readJson(path.resolve(__dirname, '../../samples/ecs/scene.json'))
    ])

    t.deepEqual(sceneFile, expected)
    done()
  })
})
