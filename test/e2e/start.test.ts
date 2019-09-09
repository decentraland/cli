import * as path from 'path'
import test from 'ava'
import * as fetch from 'isomorphic-fetch'

import * as start from '../../src/commands/start'
import { isDebug } from '../../src/utils/env'
import pathsExistOnDir from '../../src/utils/pathsExistOnDir'
import Commando from '../helpers/commando'
import sandbox from '../helpers/sandbox'
import initProject from '../helpers/initProject'

test('snapshot - dcl help start', t => {
  t.snapshot(start.help())
})

function startProject(dirPath): Promise<Commando> {
  return new Promise(resolve => {
    const command = new Commando(
      `node ${path.resolve('dist', 'cli.js')} start --no-browser -p 8001`,
      {
        silent: !isDebug(),
        workingDir: dirPath,
        env: { NODE_ENV: 'development' }
      }
    ).when(/to exit/, async () => {
      resolve(command)
    })
  })
}

test('E2E - init && start command', async t => {
  await sandbox(async (dirPath, done) => {
    // We init project without installing dependencies so we test
    // that `dcl start` automatically install dependencies as well
    await initProject(dirPath, false)
    const startCmd = await startProject(dirPath)
    const response = await fetch(`http://localhost:8001`)
    const body = await response.text()
    t.snapshot(body)
    const [gameCompiledExists, nodeModulesExists, ecsModuleExists] = await pathsExistOnDir(
      dirPath,
      ['bin/game.js', 'node_modules', 'node_modules/decentraland-ecs']
    )

    t.true(gameCompiledExists)
    t.true(nodeModulesExists)
    t.true(ecsModuleExists)
    startCmd.end()
    done()
  })
})
