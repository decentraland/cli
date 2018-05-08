import * as fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'
import { tmpTest } from '../sandbox'
import Commando from './Commando'

describe('init command', async () => {
  it('should successfully create a static project', async () => {
    await tmpTest(async (dirPath, done) => {
      const oldDir = process.cwd()
      process.chdir(dirPath)

      new Commando('../bin/dcl init', { silent: true })
        .when(/Scene title/, () => 'My test Scene\n')
        .when(/Your ethereum address/, () => '0x\n')
        .when(/Your name/, () => 'John Titor\n')
        .when(/Your email/, () => 'john.titor@example.com\n')
        .when(/Parcels comprising the scene/, () => '0,0\n')
        .when(/Which type of project would you like to generate/, () => 'static\n')
        .on('end', async () => {
          expect(await fs.pathExists(path.resolve(dirPath, 'scene.xml'))).to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'scene.json'))).to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, '.decentraland'))).to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'package.json'))).to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, 'node_modules'))).to.be.true
          expect(await fs.pathExists(path.resolve(dirPath, '.dclignore'))).to.be.true

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
  }).timeout(50000)
})
