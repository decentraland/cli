import * as fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'

import { tmpTest } from '../../sandbox'
import Commando, { Response } from './Commando'

describe('init command', async () => {
  it('should successfully create a static project', async () => {
    await tmpTest(async (dirPath, done) => {
      new Commando(`node ${path.resolve('bin', 'dcl')} init`, {
        silent: true,
        workingDir: dirPath,
        env: { DCL_ENV: 'dev' }
      })
        .when(/Send anonymous usage stats to Decentraland?/, () => Response.YES)
        .endWhen(/Installing dependencies/)
        .on('err', e => console.log(e))
        .on('end', async () => {
          expect(await fs.pathExists(path.resolve(dirPath, 'scene.tsx')), 'scene.tsx should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'scene.json')), 'scene.json should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, '.decentraland')), '.decentraland should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'package.json')), 'package.json should exist').to.be.true
          // we are skipping installation to keep things speedy
          expect(await fs.pathExists(path.resolve(dirPath, 'node_modules')), 'node_modules should exist').to.be.false
          expect(await fs.pathExists(path.resolve(dirPath, '.dclignore')), '.dclignore shoudl exist').to.be.true

          const sceneFileJson = await fs.readFile(path.resolve(dirPath, 'scene.json'))
          const sceneFile = JSON.parse(sceneFileJson.toString())

          const expected = {
            display: {
              title: sceneFile.display.title
            },
            contact: {
              name: '',
              email: ''
            },
            owner: '',
            scene: {
              parcels: ['0,0'],
              base: '0,0'
            },
            communications: {
              type: 'webrtc',
              signalling: 'https://rendezvous.decentraland.org'
            },
            policy: {
              fly: true,
              voiceEnabled: true,
              blacklist: [],
              teleportPosition: '0,0,0'
            },
            main: 'scene.js'
          }

          expect(sceneFile).to.deep.equal(expected)
          done()
        })
    })
  }).timeout(5000)
})
