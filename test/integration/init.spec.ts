import { expect } from 'chai'
import * as fs from 'fs-extra'
import { tmpTest } from './sandbox'
import { Decentraland } from '../../src/lib/Decentraland'
import * as path from 'path'

async function expectBaseFoldersToExist(dirPath) {
  expect(await fs.pathExists(path.resolve(dirPath, 'models')), 'expect models folder to exist').to.be.true
  expect(await fs.pathExists(path.resolve(dirPath, 'audio')), 'expect audio folder to exist').to.be.true
  expect(await fs.pathExists(path.resolve(dirPath, 'textures')), 'expect texture folder to exist').to.be.true
  expect(await fs.pathExists(path.resolve(dirPath, '.decentraland')), 'expect .decentraland folder to exist').to.be.true
  expect(await fs.pathExists(path.resolve(dirPath, '.decentraland', 'project.json')), 'expect project.json file to exist').to.be.true
}

describe('Decentraland.init()', () => {
  it('should successfully create a static project', async () => {
    await tmpTest(async dirPath => {
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
      await expectBaseFoldersToExist(dirPath)
    })
  })

  it('should successfully create a typescript project', async () => {
    await tmpTest(async dirPath => {
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
      await expectBaseFoldersToExist(dirPath)
    })
  })
})
