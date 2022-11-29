import path from 'path'
import WebSocket from 'ws'
import fs from 'fs-extra'

import chokidar from 'chokidar'
import { default as ignore } from 'ignore'
import { sdk } from '@dcl/schemas'
import { fail, ErrorType } from '../utils/errors'
import { Decentraland } from './Decentraland'
import { setupBffAndComms } from './controllers/bff'
import {
  ILoggerComponent,
  IMetricsComponent,
  IHttpServerComponent,
  IConfigComponent
} from '@well-known-components/interfaces'
import { HTTPProvider } from 'eth-connect'
import { RoomComponent } from '@dcl/mini-comms/dist/adapters/rooms'
import { Router } from '@well-known-components/http-server'
import { WebSocketComponent } from './adapters/ws'
import { setupCommsV1 } from './controllers/legacy-comms-v1'
import { setupDebuggingAdapter } from './controllers/debugger'
import { setupEcs6Endpoints } from './controllers/ecs6-endpoints'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'

export type PreviewComponents = {
  logs: ILoggerComponent
  server: IHttpServerComponent<PreviewComponents>
  config: IConfigComponent
  metrics: IMetricsComponent<any>
  ethereumProvider: HTTPProvider
  rooms: RoomComponent
  dcl: Decentraland
  ws: WebSocketComponent
}

export async function wirePreview(
  components: PreviewComponents,
  watch: boolean
) {
  const npmModulesPath = path.resolve(
    components.dcl.getWorkingDir(),
    'node_modules'
  )

  // TODO: dcl.project.needsDependencies() should do this
  if (!fs.pathExistsSync(npmModulesPath)) {
    fail(
      ErrorType.PREVIEW_ERROR,
      `Couldn\'t find ${npmModulesPath}, please run: npm install`
    )
  }

  const proxySetupPathEcs6 = path.resolve(
    components.dcl.getWorkingDir(),
    'node_modules',
    'decentraland-ecs',
    'src',
    'setupProxyV2.js'
  )

  const proxySetupPathEcs7 = path.resolve(
    components.dcl.getWorkingDir(),
    'node_modules',
    '@dcl',
    'sdk',
    'src',
    'setupProxyV2.js'
  )

  // this should come BEFORE the custom proxy
  const proxySetupPath = fs.existsSync(proxySetupPathEcs7)
    ? proxySetupPathEcs7
    : proxySetupPathEcs6

  const router = new Router<PreviewComponents>()
  const sceneUpdateClients = new Set<WebSocket>()

  // handle old comms
  router.get('/', async (ctx, next) => {
    if (ctx.request.headers.get('upgrade') === 'websocket') {
      const userId = ctx.url.searchParams.get('identity') as string
      if (userId) {
        return upgradeWebSocketResponse((ws: WebSocket) => {
          adoptWebSocket(ws, userId)
        })
      } else {
        return upgradeWebSocketResponse((ws: WebSocket) => {
          if (ws.readyState === ws.OPEN) {
            sceneUpdateClients.add(ws)
          } else {
            ws.on('open', () => sceneUpdateClients.add(ws))
          }
          ws.on('close', () => sceneUpdateClients.delete(ws))
        })
      }
    }

    return next()
  })

  await setupBffAndComms(components, router)
  const { adoptWebSocket } = setupCommsV1(components, router)
  await setupDebuggingAdapter(components, router)
  await setupEcs6Endpoints(components, router)
  if (watch) {
    await bindWatch(components, router, sceneUpdateClients)
  }

  components.server.setContext(components)
  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())

  if (fs.existsSync(proxySetupPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const setupProxy = require(proxySetupPath)
      setupProxy(router, components)
    } catch (err) {
      console.log(
        `${proxySetupPath} found but it couldn't be loaded properly`,
        err
      )
    }
  }
}

async function bindWatch(
  components: PreviewComponents,
  router: Router<PreviewComponents>,
  sceneUpdateClients: Set<WebSocket>
) {
  for (const project of components.dcl.workspace.getAllProjects()) {
    const ig = ignore().add((await project.getDCLIgnore())!)
    const { sceneId, sceneType } = project.getInfo()
    const sceneFile = await project.getSceneFile()
    chokidar.watch(project.getProjectWorkingDir()).on('all', (_, pathWatch) => {
      // if the updated file is the scene.json#main then skip all drop tests
      if (
        path.resolve(pathWatch) !==
        path.resolve(project.getProjectWorkingDir(), sceneFile.main)
      ) {
        if (ig.ignores(pathWatch)) {
          return
        }

        // ignore source files
        if (pathWatch.endsWith('.ts') || pathWatch.endsWith('.tsx')) {
          return
        }
      }

      sceneUpdateClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          const message: sdk.SceneUpdate = {
            type: sdk.SCENE_UPDATE,
            payload: { sceneId, sceneType }
          }

          ws.send(sdk.UPDATE)
          ws.send(JSON.stringify(message))
        }
      })
    })
  }
}
