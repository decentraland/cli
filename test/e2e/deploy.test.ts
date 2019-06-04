import * as path from 'path'
import * as fs from 'fs-extra'
import test from 'ava'

import * as deploy from '../../src/commands/deploy'
import { isDebug } from '../../src/utils/env'
import Commando, { Response } from '../helpers/commando'
import sandbox from '../helpers/sandbox'
import initProject from '../helpers/initProject'

test('snapshot - dcl help deploy', t => {
  t.snapshot(deploy.help())
})

test('E2E - deploy command', async t => {
  await new Promise(resolve => {
    const target = path.join(__dirname, '../fixtures/ecs-compiled')
    new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, {
      silent: !isDebug(),
      workingDir: target,
      env: { NODE_ENV: 'development' }
    })
      .when(/\(.* bytes\)\n/, msg => {
        t.true(msg.includes('bin/game.js'), 'expect game.js to be listed')
        return null
      })
      .when(/\(.* bytes\)\n/, msg => {
        t.true(msg.includes('scene.json'), 'expect scene.json to be listed')
        return null
      })
      .when(/You are about to upload/, (msg: string) => {
        t.true(msg.includes('You are about to upload 3 files'))
        return Response.NO
      })
      .on('end', async () => {
        resolve()
      })
  })
})

test('E2E - init && deploy - should automatically build', async t => {
  await sandbox(async (dirPath, done) => {
    await initProject(dirPath, true)
    await new Promise(resolve => {
      new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, {
        silent: !isDebug(),
        workingDir: dirPath,
        env: { NODE_ENV: 'development' }
      })
        .when(/You are about to upload/, () => {
          return Response.NO
        })
        .on('end', async () => {
          resolve()
        })
    })
    const buildExists = await fs.pathExists(path.resolve(dirPath, 'bin/game.js'))
    t.true(buildExists)
    done()
  })
})
