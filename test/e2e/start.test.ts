import * as fs from 'fs-extra'
import * as path from 'path'
import test, { ExecutionContext } from 'ava'
import * as fetch from 'isomorphic-fetch'

import { SceneMetadata } from '../../src/lib/Project'
import * as start from '../../src/commands/start'
import { isDebug } from '../../src/utils/env'
import Commando, { Response } from '../helpers/commando'
import { tmpTest } from '../helpers/sandbox'

test('snapshot - dcl help start', t => {
  t.snapshot(start.help())
})

function initProject(dirPath, t: ExecutionContext) {
  return new Promise((resolve, reject) => {
    new Commando(`node ${path.resolve('bin', 'dcl')} init`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    })
      .when(/Send anonymous usage stats to Decentraland?/, () => Response.NO)
      .endWhen(/Installing dependencies/)
      .on('err', e => reject(e))
      .on('end', async () => {
        const [
          gameExists,
          sceneExists,
          packageExists,
          nodeModulesExists,
          dclIgnoreExists
        ] = await Promise.all([
          fs.pathExists(path.resolve(dirPath, 'src', 'game.ts')),
          fs.pathExists(path.resolve(dirPath, 'scene.json')),
          fs.pathExists(path.resolve(dirPath, 'package.json')),
          fs.pathExists(path.resolve(dirPath, 'node_modules')),
          fs.pathExists(path.resolve(dirPath, '.dclignore'))
        ])

        t.true(gameExists)
        t.true(sceneExists)
        t.true(packageExists)
        t.false(nodeModulesExists)
        t.true(dclIgnoreExists)

        const [sceneFile, expected]: SceneMetadata[] = await Promise.all([
          fs.readJson(path.resolve(dirPath, 'scene.json')),
          fs.readJson(path.resolve(__dirname, '../../samples/ecs/scene.json'))
        ])

        t.deepEqual(sceneFile, expected)
        resolve()
      })
  })
}

function startProject(dirPath): Promise<Commando> {
  return new Promise(resolve => {
    const command = new Commando(`node ${path.resolve('bin', 'dcl')} start --no-browser -p 8001`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    }).when(/to exit/, async () => {
      resolve(command)
    })
  })
}

test('E2E - init && start command', async t => {
  await tmpTest(async (dirPath, done) => {
    // We init project without installing dependencies so we test
    // that `dcl start` automatically install dependencies as well
    await initProject(dirPath, t)
    const startCmd = await startProject(dirPath)
    const response = await fetch(`http://localhost:8001`)
    const body = await response.text()
    t.snapshot(body)
    const [gameCompiledExists, nodeModulesExists, ecsModuleExists] = await Promise.all([
      fs.pathExists(path.resolve(dirPath, 'bin', 'game.js')),
      fs.pathExists(path.resolve(dirPath, 'node_modules')),
      fs.pathExists(path.resolve(dirPath, 'node_modules', 'decentraland-ecs'))
    ])

    t.true(gameCompiledExists)
    t.true(nodeModulesExists)
    t.true(ecsModuleExists)
    startCmd.end()
    done()
  })
})
