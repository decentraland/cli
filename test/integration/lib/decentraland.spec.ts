import { expect } from 'chai'
import * as fs from 'fs-extra'
import { tmpTest } from '../sandbox'
import { Decentraland } from '../../../src/lib/Decentraland'
import * as path from 'path'

async function expectBaseFilesToExist(dirPath) {
  expect(await fs.pathExists(path.resolve(dirPath, '.decentraland')), 'expect .decentraland folder to exist').to.be.true
  expect(await fs.pathExists(path.resolve(dirPath, '.decentraland', 'project.json')), 'expect project.json file to exist').to.be.true
}

async function expectBasicDCLIgnore(dirPath) {
  const file = await fs.readFile(path.resolve(dirPath, '.dclignore'), 'utf-8')
  expect(file, 'expect .dclignore file to contain base definition').to.equal(
    `.*\npackage.json\npackage-lock.json\nyarn-lock.json\nbuild.json\ntsconfig.json\ntslint.json\nnode_modules/\n*.ts\n*.tsx\ndist/`
  )
}

describe('Decentraland.init()', () => {
  it('should successfully create a static project', async () => {
    await tmpTest(async (dirPath, done) => {
      const dcl = new Decentraland({
        workingDir: dirPath
      })

      const scenePath = path.resolve(dirPath, 'scene.json')

      await dcl.init(
        {
          main: 'scene.xml'
        },
        'static' as any
      )

      const sceneFile = await fs.readJson(scenePath)

      expect(sceneFile.main).to.equal('scene.xml')
      await expectBaseFilesToExist(dirPath)
      await expectBasicDCLIgnore(dirPath)
      done()
    })
  }).timeout(5000)

  it('should successfully create a typescript project', async () => {
    await tmpTest(async (dirPath, done) => {
      const dcl = new Decentraland({
        workingDir: dirPath
      })

      const scenePath = path.resolve(dirPath, 'scene.json')

      await dcl.init(
        {
          main: 'scene.xml'
        },
        'singleplayer' as any
      )

      const sceneFile = await fs.readJson(scenePath)

      expect(sceneFile.main).to.equal('scene.js')
      await expectBaseFilesToExist(dirPath)
      await expectBasicDCLIgnore(dirPath)
      done()
    })
  }).timeout(5000)

  it('should successfully create a websocket project', async () => {
    await tmpTest(async (dirPath, done) => {
      const dcl = new Decentraland({
        workingDir: dirPath
      })

      const scenePath = path.resolve(dirPath, 'scene.json')

      await dcl.init(
        {
          main: 'scene.xml'
        },
        'multiplayer' as any,
        'wss://localhost:3000'
      )

      const sceneFile = await fs.readJson(scenePath)

      expect(sceneFile.main).to.equal('wss://localhost:3000')
      await expectBaseFilesToExist(dirPath)
      const file = await fs.readFile(path.resolve(dirPath, '.dclignore'), 'utf-8')
      expect(file, 'expect .dclignore file to contain base definition').to.equal(
        `.*\npackage.json\npackage-lock.json\nyarn-lock.json\nbuild.json\ntsconfig.json\ntslint.json\nnode_modules/\n*.ts\n*.tsx\ndist/\nserver/`
      )
      done()
    })
  }).timeout(5000)
})
