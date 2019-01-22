import * as path from 'path'

import test from 'ava'

import { isDebug } from '../../src/utils/env'
import Commando, { Response } from './helpers/commando'

test('E2E - deploy command', async t => {
  await new Promise(resolve => {
    const target = path.join(__dirname, 'fixtures/ecs-compiled')
    new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, {
      silent: !isDebug(),
      workingDir: target,
      env: { DCL_ENV: 'dev' }
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
        t.true(msg.includes('You are about to upload 2 files'))
        return Response.NO
      })
      .on('end', async () => {
        resolve()
      })
  })
})