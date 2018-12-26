import * as fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'

import { tmpTest, TIMEOUT_MS } from '../../sandbox'
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
          expect(await fs.pathExists(path.resolve(dirPath, 'src', 'game.ts')), 'game.ts should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'scene.json')), 'scene.json should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'package.json')), 'package.json should exist').to.be.true
          // we are skipping installation to keep things speedy
          expect(await fs.pathExists(path.resolve(dirPath, 'node_modules')), 'node_modules should exist').to.be.false
          expect(await fs.pathExists(path.resolve(dirPath, '.dclignore')), '.dclignore should exist').to.be.true

          const sceneFileJson = await fs.readFile(path.resolve(dirPath, 'scene.json'))
          const sceneFile = JSON.parse(sceneFileJson.toString())

          const expected = {
            display: { title: 'interactive-text', favicon: 'favicon_asset' },
            contact: { name: 'king of the bongo', email: '' },
            owner: '',
            scene: { parcels: ['0,0'], base: '0,0' },
            communications: { type: 'webrtc', signalling: 'https://signalling-01.decentraland.org' },
            policy: { contentRating: 'E', fly: true, voiceEnabled: true, blacklist: [], teleportPosition: '' },
            main: 'bin/game.js',
            tags: []
          }

          expect(sceneFile).to.deep.equal(expected)
          done()
        })
    })
  }).timeout(TIMEOUT_MS)
})
