import path from 'path'
import WebSocket from 'ws'
import { fork } from 'child_process'
import { createServer } from 'http'
import { EventEmitter } from 'events'
import express from 'express'
import cors from 'cors'
import fs from 'fs-extra'
import portfinder from 'portfinder'
import glob from 'glob'
import chokidar from 'chokidar'
import url from 'url'
import { default as ignore } from 'ignore'
import { sdk } from '@dcl/schemas'

import proto from './proto/broker'
import { fail, ErrorType } from '../utils/errors'
import getDummyMappings from '../utils/getDummyMappings'
import { Decentraland } from './Decentraland'

/**
 * Events emitted by this class:
 *
 * preview:ready - The server is up and running
 */
export class Preview extends EventEmitter {
  private app = express()
  private server = createServer(this.app)
  private wss = new WebSocket.Server({ server: this.server })
  private watch: boolean

  constructor(public dcl: Decentraland, watch: boolean) {
    super()
    this.watch = watch
  }

  async startServer(port: number) {
    const relativiseUrl = (url: string) => {
      url = url.replace(/[\/\\]/g, '/')
      const newRoot = this.dcl
        .getWorkingDir()
        .replace(/\//g, '/')
        .replace(/\\/g, '/')
      if (newRoot.endsWith('/')) {
        return url.replace(newRoot, '')
      } else {
        return url.replace(newRoot + '/', '')
      }
    }

    let resolvedPort = port

    if (!resolvedPort) {
      try {
        resolvedPort = await portfinder.getPortPromise()
      } catch (e) {
        resolvedPort = 2044
      }
    }

    if (this.watch) {
      for (const project of this.dcl.workspace.getAllProjects()) {
        const ig = ignore().add((await project.getDCLIgnore())!)
        const { sceneId, sceneType } = project.getInfo()
        chokidar
          .watch(project.getProjectWorkingDir())
          .on('all', (_, pathWatch) => {
            if (ig.ignores(pathWatch)) {
              return
            }

            this.wss.clients.forEach((ws) => {
              if (
                ws.readyState === WebSocket.OPEN &&
                (!ws.protocol || ws.protocol === 'scene-updates')
              ) {
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

    this.app.use(cors())

    const npmModulesPath = path.resolve(
      this.dcl.getWorkingDir(),
      'node_modules'
    )

    // TODO: dcl.project.needsDependencies() should do this
    if (!fs.pathExistsSync(npmModulesPath)) {
      fail(
        ErrorType.PREVIEW_ERROR,
        `Couldn\'t find ${npmModulesPath}, please run: npm install`
      )
    }

    const dclEcsPath = path.resolve(
      this.dcl.getWorkingDir(),
      'node_modules',
      'decentraland-ecs'
    )
    const proxySetupPath = path.resolve(dclEcsPath, 'src', 'setupProxy.js')
    const dclApiPath = path.resolve(
      this.dcl.getWorkingDir(),
      'node_modules',
      'decentraland-api'
    )

    const artifactPath = fs.pathExistsSync(dclEcsPath) ? dclEcsPath : dclApiPath
    const unityPath = path.resolve(dclEcsPath, 'artifacts', 'unity')

    if (fs.existsSync(proxySetupPath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const setupProxy = require(proxySetupPath)
        setupProxy(this.dcl, this.app, express)
      } catch (err) {
        console.log(
          `${proxySetupPath} found but it couldn't be loaded properly`,
          err
        )
      }
    }

    if (!fs.pathExistsSync(artifactPath)) {
      fail(
        ErrorType.PREVIEW_ERROR,
        `Couldn\'t find ${dclApiPath} or ${dclEcsPath}, please run: npm install`
      )
    }

    this.app.get('/', async (req, res) => {
      res.setHeader('Content-Type', 'text/html')

      const htmlPath = path.resolve(artifactPath, 'artifacts/preview.html')

      const html = await fs.readFile(htmlPath, {
        encoding: 'utf8'
      })

      res.send(html)
    })

    this.app.use('/@', express.static(artifactPath))

    this.app.use('/unity', express.static(unityPath))

    this.app.use('/contents/', express.static(this.dcl.getWorkingDir()))

    this.app.get('/mappings', (req, res) => {
      glob(this.dcl.getWorkingDir() + '/**/*', (err, files) => {
        if (err) {
          res.status(500)
          res.json(err)
          res.end()
        } else {
          const ret = getDummyMappings(files.map(relativiseUrl))
          ret.contents = ret.contents.map(({ file, hash }) => ({
            file,
            hash: `contents/${hash}`
          }))

          res.json(ret)
        }
      })
    })

    this.app.get('/scene.json', (_, res) => {
      res.sendFile(path.join(this.dcl.getWorkingDir(), 'scene.json'))
    })

    this.app.use(express.static(path.join(artifactPath, 'artifacts')))

    setComms(this.wss)
    setDebugRunner(this.wss)

    this.emit('preview:ready', resolvedPort)

    return new Promise((resolve, reject) => {
      this.server.listen(resolvedPort).on('close', resolve).on('error', reject)
    })
  }
}

function setDebugRunner(wss: WebSocket.Server) {
  wss.on('connection', (ws) => {
    if (ws.protocol === 'dcl-scene') {
      const file = require.resolve('dcl-node-runtime')

      const theFork = fork(file, [], {
        // enable two way IPC
        stdio: [0, 1, 2, 'ipc'],
        cwd: process.cwd()
      })

      console.log(`> Creating scene fork #` + theFork.pid)

      theFork.on('close', () => {
        if (ws.readyState === ws.OPEN) {
          ws.close()
        }
      })
      theFork.on('message', (message) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(message)
        }
      })
      ws.on('message', (data) => theFork.send(data.toString()))
      ws.on('close', () => {
        console.log('> Killing fork #' + theFork.pid)
        theFork.kill()
      })
    }
  })
}

function setComms(wss: WebSocket.Server) {
  const connections = new Set<WebSocket>()
  const topicsPerConnection = new WeakMap<WebSocket, Set<string>>()
  let connectionCounter = 0

  const aliasToUserId = new Map<number, string>()

  function getTopicList(socket: WebSocket): Set<string> {
    let set = topicsPerConnection.get(socket)
    if (!set) {
      set = new Set()
      topicsPerConnection.set(socket, set)
    }
    return set
  }

  wss.on('connection', function connection(ws, req) {
    if (ws.protocol !== 'comms') {
      return
    }
    const alias = ++connectionCounter

    const query = url.parse(req.url!, true).query
    const userId = query['identity'] as string
    aliasToUserId.set(alias, userId)

    console.log('Acquiring comms connection.')

    connections.add(ws)

    ws.on('message', (message) => {
      const data = message as Buffer
      const msgType = proto.CoordinatorMessage.deserializeBinary(data).getType()

      if (msgType === proto.MessageType.PING) {
        ws.send(data)
      } else if (msgType === proto.MessageType.TOPIC) {
        const topicMessage = proto.TopicMessage.deserializeBinary(data)

        const topic = topicMessage.getTopic()

        const topicFwMessage = new proto.TopicFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        // Reliable/unreliable data
        connections.forEach(($) => {
          if (ws !== $) {
            if (getTopicList($).has(topic)) {
              $.send(topicData)
            }
          }
        })
      } else if (msgType === proto.MessageType.TOPIC_IDENTITY) {
        const topicMessage = proto.TopicIdentityMessage.deserializeBinary(data)

        const topic = topicMessage.getTopic()

        const topicFwMessage = new proto.TopicIdentityFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_IDENTITY_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setIdentity(aliasToUserId.get(alias)!)
        topicFwMessage.setRole(proto.Role.CLIENT)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        // Reliable/unreliable data
        connections.forEach(($) => {
          if (ws !== $) {
            if (getTopicList($).has(topic)) {
              $.send(topicData)
            }
          }
        })
      } else if (msgType === proto.MessageType.SUBSCRIPTION) {
        const topicMessage = proto.SubscriptionMessage.deserializeBinary(data)
        const rawTopics = topicMessage.getTopics()
        const topics = Buffer.from(rawTopics as string).toString('utf8')
        const set = getTopicList(ws)

        set.clear()
        topics.split(/\s+/g).forEach(($) => set.add($))
      }
    })

    ws.on('close', () => connections.delete(ws))

    setTimeout(() => {
      const welcome = new proto.WelcomeMessage()
      welcome.setType(proto.MessageType.WELCOME)
      welcome.setAlias(alias)
      const data = welcome.serializeBinary()

      ws.send(data, (err) => {
        if (err) {
          try {
            ws.close()
          } catch {}
        }
      })
    }, 100)
  })
}
