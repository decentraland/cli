import * as path from 'path'
import * as fs from 'fs-extra'
import test from 'ava'

import { help } from '../../src/commands/coords'
import sandbox from '../helpers/sandbox'
import Commando from '../helpers/commando'
import { isDebug } from '../../src/utils/env'
import { readJSON } from '../../src/utils/filesystem'
import { SceneMetadata } from '../../src/sceneJson/types'

function coordsCommand(dirPath: string, coords: string[]) {
  return new Promise<void>(resolve => {
    const cmd = new Commando(`node ${path.resolve('dist', 'cli.js')} coords ${coords.join(' ')}`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    })

    cmd.on('end', async () => {
      resolve()
    })
  })
}

test('snapshot - dcl help instal', t => {
  t.snapshot(help)
})

test('E2E - coords 0,8', async t => {
  await sandbox(async (dirPath, done) => {
    const sw = '0,8'
    const scenePath = path.resolve(dirPath, 'scene.json')
    await fs.writeJson(scenePath, { scene: {} })
    await coordsCommand(dirPath, [sw])

    const sceneJson = await readJSON<SceneMetadata>(scenePath)
    const expectedScene: SceneMetadata['scene'] = {
      base: '0,8',
      parcels: ['0,8']
    }
    t.deepEqual(sceneJson.scene, expectedScene)
    done()
  })
})

test('E2E - coords 0,0 2,3', async t => {
  await sandbox(async (dirPath, done) => {
    const sw = '0,0'
    const ne = '2,3'
    const scenePath = path.resolve(dirPath, 'scene.json')
    await fs.writeJson(scenePath, { scene: {} })
    await coordsCommand(dirPath, [sw, ne])

    const sceneJson = await readJSON<SceneMetadata>(scenePath)
    const expectedScene: SceneMetadata['scene'] = {
      base: '0,0',
      parcels: ['0,0', '0,1', '0,2', '0,3', '1,0', '1,1', '1,2', '1,3', '2,0', '2,1', '2,2', '2,3']
    }
    t.deepEqual(sceneJson.scene, expectedScene)
    done()
  })
})

test('E2E - coords 0,0 2,3 2,2', async t => {
  await sandbox(async (dirPath, done) => {
    const sw = '0,0'
    const ne = '2,3'
    const base = '2,2'
    const scenePath = path.resolve(dirPath, 'scene.json')
    await fs.writeJson(scenePath, { scene: {} })
    await coordsCommand(dirPath, [sw, ne, base])

    const sceneJson = await readJSON<SceneMetadata>(scenePath)
    const expectedScene: SceneMetadata['scene'] = {
      base: '2,2',
      parcels: ['0,0', '0,1', '0,2', '0,3', '1,0', '1,1', '1,2', '1,3', '2,0', '2,1', '2,2', '2,3']
    }
    t.deepEqual(sceneJson.scene, expectedScene)
    done()
  })
})

test('E2E - coords 0,0 2,3 2,2 should fail with invalid base parcel', async t => {
  await sandbox(async (dirPath, done) => {
    const sw = '0,0'
    const ne = '2,3'
    const base = '5,2'
    const scenePath = path.resolve(dirPath, 'scene.json')
    await fs.writeJson(scenePath, { scene: {} })
    await coordsCommand(dirPath, [sw, ne, base])
    const sceneJson = await readJSON<SceneMetadata>(scenePath)
    const expectedScene = {}

    t.deepEqual(sceneJson.scene, expectedScene)
    done()
  })
})

test('E2E - coords 2,3 0,0 should fail with invalid sw ne', async t => {
  await sandbox(async (dirPath, done) => {
    const sw = '2,3'
    const ne = '0,0'
    const scenePath = path.resolve(dirPath, 'scene.json')
    await fs.writeJson(scenePath, { scene: {} })
    await coordsCommand(dirPath, [sw, ne])
    const sceneJson = await readJSON<SceneMetadata>(scenePath)
    const expectedScene = {}

    t.deepEqual(sceneJson.scene, expectedScene)
    done()
  })
})
