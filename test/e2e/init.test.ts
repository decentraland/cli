import * as fs from 'fs-extra'
import * as path from 'path'
import test from 'ava'

import { SceneMetadata } from '../../src/lib/Project'
import * as init from '../../src/commands/init'
import { isDebug } from '../../src/utils/env'
import Commando, { Response } from '../helpers/commando'
import { tmpTest } from '../helpers/sandbox'

test('snapshot - dcl help init', t => {
  t.snapshot(init.help())
})

test('E2E - init command', async t => {
  await tmpTest(async (dirPath, done) => {
    new Commando(`node ${path.resolve('bin', 'dcl')} init`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    })
      .when(/Send anonymous usage stats to Decentraland?/, () => Response.NO)
      .on('err', e => console.log(e))
      .on('end', async () => {
        const [
          gameExists,
          sceneExists,
          packageExists,
          nodeModulesExists,
          dclIgnoreExists,
          ecsModuleExist
        ] = await Promise.all([
          fs.pathExists(path.resolve(dirPath, 'src', 'game.ts')),
          fs.pathExists(path.resolve(dirPath, 'scene.json')),
          fs.pathExists(path.resolve(dirPath, 'package.json')),
          fs.pathExists(path.resolve(dirPath, 'node_modules')),
          fs.pathExists(path.resolve(dirPath, '.dclignore')),
          fs.pathExists(path.resolve(dirPath, 'node_modules', 'decentraland-ecs'))
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
})
