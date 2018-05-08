import * as fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'
import { tmpTest } from '../sandbox'
import Commando, { Response } from './Commando'

describe('init command', async () => {
  it('should successfully create a static project', async () => {
    await tmpTest(async (dirPath, done) => {
      const oldDir = process.cwd()
      process.chdir(dirPath)

      console.log(path.join('..', 'bin'))

      new Commando('dcl init', { silent: true, cmdPath: path.join('..', 'bin'), env: { DCL_ENV: 'dev' } })
        .when(/Send anonymous usage stats to Decentraland?/, () => Response.YES)
        .when(/Scene title/, () => 'My test Scene\n')
        .when(/Your ethereum address/, () => '0x\n')
        .when(/Your name/, () => 'John Titor\n')
        .when(/Your email/, () => 'john.titor@example.com\n')
        .when(/Parcels comprising the scene/, () => '0,0\n')
        .when(/Which type of project would you like to generate/, () => 'static\n')
        .endWhen(/Installing dependencies.../)
        .on('end', async () => {
          expect(await fs.pathExists(path.resolve(dirPath, 'scene.xml')), 'scene.xml should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'scene.json')), 'scene.json should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, '.decentraland')), '.decentraland should exist').to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'package.json')), 'package.json should exist').to.be.true
          // we are skipping installation to keep things speedy
          expect(await fs.pathExists(path.resolve(dirPath, 'node_modules')), 'node_modules should exist').to.be.false
          expect(await fs.pathExists(path.resolve(dirPath, '.dclignore')), '.dclignore shoudl exist').to.be.true

          const sceneFile = await fs.readFile(path.resolve(dirPath, 'scene.json'))

          expect(JSON.parse(sceneFile.toString())).to.deep.equal({
            display: {
              title: 'My test Scene'
            },
            owner: '0x',
            contact: {
              name: 'John Titor',
              email: 'john.titor@example.com'
            },
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
            main: 'scene.xml'
          })

          process.chdir(oldDir)

          done()
        })
    })
  }).timeout(5000)
})
