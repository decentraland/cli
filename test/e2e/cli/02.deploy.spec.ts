import * as fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'
import { tmpTest } from '../../sandbox'
import Commando, { Response } from './Commando'

describe('deploy command', async () => {
  it('should display files before upload', async () => {
    await tmpTest(async (dirPath, done) => {
      new Commando(`node ${path.resolve('bin', 'dcl')} init`, {
        silent: false,
        workingDir: dirPath,
        env: { DCL_ENV: 'dev' }
      })
        .when(/Scene title/, () => 'My test Scene\n')
        .when(/Your ethereum address/, () => '0x\n')
        .when(/Your name/, () => 'John Titor\n')
        .when(/Your email/, () => 'john.titor@example.com\n')
        .when(/Parcels comprising the scene/, () => '0,0\n')
        .when(/Which scene template would you like to generate/, () => '4\n')
        .endWhen(/Installing dependencies/)
        .on('end', async () => {
          new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, {
            silent: false,
            workingDir: dirPath,
            env: { DCL_ENV: 'dev' }
          })
            .when(/\(.* bytes\)\n/, msg => {
              const file = msg.trim().match(/(\w*\.\w*)/g)
              expect(file.includes('scene.json'), 'expect scene.json to be listed').to.be.true
              return null
            })
            .when(/\(.* bytes\)\n/, msg => {
              const file = msg.trim().match(/(\w*\.\w*)/g)
              expect(file.includes('scene.xml'), 'expect scene.xml to be listed').to.be.true
              return null
            })
            .when(/You are about to upload/, (msg: string) => {
              expect(msg.includes('You are about to upload 2 files'), 'expect file count to be correct').to.be.true
              return Response.NO
            })
            .on('end', async () => {
              done()
            })
        })
    })
  }).timeout(5000)
})
