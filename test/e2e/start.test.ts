import path from 'path'
import test, { ExecutionContext } from 'ava'
import fetch, { RequestInfo, RequestInit } from 'node-fetch'

import * as start from '../../src/commands/start'
import { isDebug } from '../../src/utils/env'
import pathsExistOnDir from '../../src/utils/pathsExistOnDir'
import Commando from '../helpers/commando'
import sandbox from '../helpers/sandbox'
import initProject from '../helpers/initProject'
import { AboutResponse } from '@dcl/protocol/out-ts/bff/http-endpoints.gen'

test('snapshot - dcl help start', (t) => {
  t.snapshot(start.help())
})

function startProject(dirPath): Promise<Commando> {
  return new Promise((resolve) => {
    const command = new Commando(
      `node ${path.resolve('dist', 'index.js')} start --skip-version-checks --no-browser -p 8001`,
      {
        silent: !isDebug(),
        workingDir: dirPath,
        env: { NODE_ENV: 'development' }
      }
    ).when(/to exit/, async () => {
      resolve(command)
    })
  })
}

test('E2E - init && start command', async (t) => {
  await sandbox(async (dirPath, done) => {
    // We init project without installing dependencies so we test
    // that `dcl start` automatically install dependencies as well
    await initProject(dirPath, false)
    const startCmd = await startProject(dirPath)
    const response = await fetch(`http://localhost:8001`)
    const body = await response.text()
    t.snapshot(body)
    const [gameCompiledExists, nodeModulesExists, ecsModuleExists] = await pathsExistOnDir(dirPath, [
      'bin/game.js',
      'node_modules',
      'node_modules/decentraland-ecs'
    ])

    t.true(gameCompiledExists)
    t.true(nodeModulesExists)
    t.true(ecsModuleExists)

    await testWearablePreview(t)
    await testAbout(t)

    startCmd.end()
    done()
  })
})

async function testWearablePreview(t: ExecutionContext<any>) {
  const scene = await fetchJson('http://localhost:8001/scene.json')
  t.deepEqual(
    { display: scene.display },
    {
      display: {
        title: 'DCL Scene',
        description: 'My new Decentraland project',
        navmapThumbnail: 'images/scene-thumbnail.png',
        favicon: 'favicon_asset'
      }
    },
    'get /scene.json works'
  )
}

async function testAbout(t: ExecutionContext<any>) {
  {
    const about = (await fetchJson('http://localhost:8001/about')) as AboutResponse
    t.is(about.content.publicUrl, 'http://localhost:8001/content', 'content server URL properly configured')
    t.is(about.lambdas.publicUrl, 'http://localhost:8001/lambdas', 'lambdas server URL properly configured')
    t.is(
      about.comms.fixedAdapter,
      'ws-room:ws://localhost:8001/mini-comms/room-1',
      'lambdas server URL properly configured'
    )
  }
  {
    const about = (await fetchJson('http://127.0.0.1:8001/about', {
      headers: { 'x-forwarded-proto': 'https' }
    })) as AboutResponse
    t.is(about.content.publicUrl, 'https://127.0.0.1:8001/content', 'content server URL properly configured')
    t.is(about.lambdas.publicUrl, 'https://127.0.0.1:8001/lambdas', 'lambdas server URL properly configured')
    t.is(
      about.comms.fixedAdapter,
      'ws-room:wss://127.0.0.1:8001/mini-comms/room-1',
      'lambdas server URL properly configured'
    )
  }
}

async function fetchJson(init: RequestInfo, param?: RequestInit) {
  const res = await fetch(init, param)
  if (!res.ok) throw new Error('Error fetching ' + JSON.stringify(init))
  return res.json()
}
