import * as path from 'path'
import * as fs from 'fs-extra'
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
  }).timeout(TIMEOUT_MS)

  it('should display an error message if owner attribute is missing', async () => {
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
              return Response.YES
            })
            .endWhen(/Missing owner attribute at scene.json/, (msg: string) => {
              expect(
                msg.includes('Missing owner attribute at scene.json. Owner attribute is required for deploying'),
                'expect error message to be displayed'
              ).to.be.true
              return null
            })
            .on('end', async () => {
              done()
            })
        })
    })
  }).timeout(TIMEOUT_MS)

  it(`should display an error message if owner hasn't got deploying permission`, async () => {
    await tmpTest(async (dirPath, done) => {
      new Commando(`node ${path.resolve('bin', 'dcl')} init`, { silent: true, workingDir: dirPath, env: { DCL_ENV: 'dev' } })
        .endWhen(/Installing dependencies/)
        .on('end', async () => {
          const sceneFileJson = await fs.readFile(path.resolve(dirPath, 'scene.json'))
          const sceneFile = JSON.parse(sceneFileJson.toString())
          sceneFile.owner = '0x8bed95d830475691c10281f1fea2c0a0fe51304b'
          await fs.writeFile(path.resolve(dirPath, 'scene.json'), JSON.stringify(sceneFile))

          new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, {
            silent: true,
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
              return Response.YES
            })
            .endWhen(/Provided address/, (msg: string) => {
              expect(
                msg.includes('Provided address 0x8bed95d830475691c10281f1fea2c0a0fe51304b is not authorized to update LAND 0,0'),
                'expect error message to be displayed'
              ).to.be.true
              return null
            })
            .on('end', async () => {
              done()
            })
        })
    })
  }).timeout(TIMEOUT_MS)
})
