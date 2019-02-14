import * as fs from 'fs-extra'
import * as path from 'path'
import test from 'ava'

import { tmpTest } from '../helpers/sandbox'
import { Decentraland } from '../../src/lib/Decentraland'
import { BoilerplateType, SceneMetadata } from '../../src/lib/Project'

async function isBasicDCLIgnore(dirPath: string): Promise<boolean> {
  const file = await fs.readFile(path.resolve(dirPath, '.dclignore'), 'utf-8')
  return (
    file ===
    `.*\npackage.json\npackage-lock.json\nyarn-lock.json\nbuild.json\ntsconfig.json\ntslint.json\nnode_modules/\n*.ts\n*.tsx\nDockerfile\ndist/`
  )
}

test('Integration - Decentraland.init() - should successfully create a static project', async t => {
  await tmpTest(async (dirPath, done) => {
    const dcl = new Decentraland({
      workingDir: dirPath
    })

    const scenePath = path.resolve(dirPath, 'scene.json')

    await dcl.init({ main: 'scene.xml' } as SceneMetadata, BoilerplateType.STATIC)

    const sceneFile = await fs.readJson(scenePath)

    t.is(sceneFile.main, 'scene.xml')
    t.true(await isBasicDCLIgnore(dirPath))
    done()
  })
})

test('Integration - Decentraland.init() - should successfully create a static typescript project', async t => {
  await tmpTest(async (dirPath, done) => {
    const dcl = new Decentraland({
      workingDir: dirPath
    })

    const scenePath = path.resolve(dirPath, 'scene.json')

    await dcl.init({ main: 'scene.xml' } as SceneMetadata, BoilerplateType.TYPESCRIPT_STATIC)

    const sceneFile = await fs.readJson(scenePath)

    t.is(sceneFile.main, 'scene.js')
    t.true(await isBasicDCLIgnore(dirPath))
    done()
  })
})

test('Integration - Decentraland.init() - should successfully create a ECS project', async t => {
  await tmpTest(async (dirPath, done) => {
    const dcl = new Decentraland({
      workingDir: dirPath
    })

    const scenePath = path.resolve(dirPath, 'scene.json')

    await dcl.init({ main: '???' } as SceneMetadata, BoilerplateType.ECS)

    const sceneFile = await fs.readJson(scenePath)

    t.is(sceneFile.main, 'bin/game.js')
    t.true(await isBasicDCLIgnore(dirPath))

    const [tsconfigExists, gameExists, packageExists] = await Promise.all([
      fs.pathExists(path.resolve(dirPath, 'tsconfig.json')),
      fs.pathExists(path.resolve(dirPath, 'src/game.ts')),
      fs.pathExists(path.resolve(dirPath, 'package.json'))
    ])

    t.true(tsconfigExists)
    t.true(gameExists)
    t.true(packageExists)

    done()
  })
})
