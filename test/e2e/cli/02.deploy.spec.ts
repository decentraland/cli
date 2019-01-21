import * as path from 'path'
import { expect } from 'chai'

import { tmpTest, TIMEOUT_MS } from '../../sandbox'
import Commando, { Response } from './Commando'

describe('deploy command', async () => {
  it('should display files before upload', async () => {
    await tmpTest(async (dirPath, done) => {
      new Commando(`node ${path.resolve('bin', 'dcl')} init`, {
        silent: true,
        workingDir: dirPath,
        env: { DCL_ENV: 'dev' }
      })
        .endWhen(/Installing dependencies/)
        .on('end', async () => {
          new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, {
            silent: true,
            workingDir: dirPath,
            env: { DCL_ENV: 'dev' }
          })
            .when(/\(.* bytes\)\n/, msg => {
              const file = msg.trim().match(/(\w*\.\w*)/g)
              expect(file.includes('bin/game.js'), 'expect game.js to be listed').to.be.true
              return null
            })
            .when(/\(.* bytes\)\n/, msg => {
              const file = msg.trim().match(/(\w*\.\w*)/g)
              expect(file.includes('scene.json'), 'expect scene.json to be listed').to.be.true
              return null
            })
            .when(/You are about to upload/, (msg: string) => {
              expect(
                msg.includes('You are about to upload 2 files'),
                'expect file count to be correct'
              ).to.be.true
              return Response.NO
            })
            .on('end', async () => {
              done()
            })
        })
    })
  }).timeout(TIMEOUT_MS)
})
