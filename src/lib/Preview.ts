import * as path from 'path'
import { createServer } from 'http'
import * as WebSocket from 'ws'
import * as express from 'express'
import { EventEmitter } from 'events'
import * as fs from 'fs-extra'
import * as portfinder from 'portfinder'
import * as proto from './proto/broker'

import * as cors from 'cors'
import * as glob from 'glob'
import * as chokidar from 'chokidar'
import * as ignore from 'ignore'

import { fail, ErrorType } from '../utils/errors'
import getDummyMappings from '../utils/getDummyMappings'

type Decentraland = import('./Decentraland').Decentraland

/**
 * Events emitted by this class:
 *
 * preview:ready - The server is up and running
 */
export class Preview extends EventEmitter {
  private app = express()
  private server = createServer(this.app)
  private wss = new WebSocket.Server({ server: this.server })
  private ignoredPaths: string
  private watch: boolean

  constructor(public dcl: Decentraland, ignoredPaths: string, watch: boolean) {
    super()
    this.ignoredPaths = ignoredPaths
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

    const ig = (ignore as any)().add(this.ignoredPaths)

    let resolvedPort = port

    if (!resolvedPort) {
      try {
        resolvedPort = await portfinder.getPortPromise()
      } catch (e) {
        resolvedPort = 2044
      }
    }

    if (this.watch) {
      chokidar.watch(this.dcl.getWorkingDir()).on('all', (event, path) => {
        if (!ig.ignores(path)) {
          this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send('update')

              client.send(
                JSON.stringify({
                  type: 'update',
                  path: relativiseUrl(path)
                })
              )
            }
          })
        }
      })
    }

    this.app.use(cors())

    const npmModulesPath = path.resolve(this.dcl.getWorkingDir(), 'node_modules')

    // TODO: dcl.project.needsDependencies() should do this
    if (!fs.pathExistsSync(npmModulesPath)) {
      fail(ErrorType.PREVIEW_ERROR, `Couldn\'t find ${npmModulesPath}, please run: npm install`)
    }

    const dclEcsPath = path.resolve(this.dcl.getWorkingDir(), 'node_modules', 'decentraland-ecs')
    const dclApiPath = path.resolve(this.dcl.getWorkingDir(), 'node_modules', 'decentraland-api')

    const artifactPath = fs.pathExistsSync(dclEcsPath) ? dclEcsPath : dclApiPath
    const unityPath = path.resolve(dclEcsPath, 'artifacts', 'unity')

    if (!fs.pathExistsSync(artifactPath)) {
      fail(
        ErrorType.PREVIEW_ERROR,
        `Couldn\'t find ${dclApiPath} or ${dclEcsPath}, please run: npm install`
      )
    }

    this.app.get('/', async (req, res) => {
      res.setHeader('Content-Type', 'text/html')
      const ethConnectExists = await fs.pathExists(
        path.resolve(this.dcl.getWorkingDir(), 'node_modules', 'eth-connect')
      )

      const htmlPath = path.resolve(artifactPath, 'artifacts/preview.html')

      const html = await fs.readFile(htmlPath, {
        encoding: 'utf8'
      })

      const response = html.replace(
        '<script src="/@/artifacts/preview.js"></script>',
        `<script>window.avoidWeb3=${!ethConnectExists}</script>\n<script src="/@/artifacts/preview.js"></script>`
      )

      res.send(response)
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
          ret.contents = ret.contents.map(({ file, hash }) => ({ file, hash: `contents/${hash}` }))

          res.json(ret)
        }
      })
    })

    setComms(this.wss)

    this.emit('preview:ready', resolvedPort)

    return new Promise((resolve, reject) => {
      this.server
        .listen(resolvedPort)
        .on('close', resolve)
        .on('error', reject)
    })
  }
}

function setComms(wss: WebSocket.Server) {
  const connections = new Set<WebSocket>()
  const topicsPerConnection = new WeakMap<WebSocket, Set<string>>()
  let connectionCounter = 0

  function getTopicList(socket: WebSocket): Set<string> {
    let set = topicsPerConnection.get(socket)
    if (!set) {
      set = new Set()
      topicsPerConnection.set(socket, set)
    }
    return set
  }

  wss.on('connection', function connection(ws) {
    if (ws.protocol !== 'comms') {
      return
    }
    const alias = ++connectionCounter

    console.log('Acquiring comms connection.')

    connections.add(ws)

    ws.on('message', message => {
      const data = message as Buffer
      const msgType = proto.CoordinatorMessage.deserializeBinary(data).getType()

      if (msgType === proto.MessageType.PING) {
        ws.send(data)
      } else if (msgType === proto.MessageType.TOPIC) {
        const topicMessage = proto.TopicMessage.deserializeBinary(data)

        const topic = topicMessage.getTopic()

        const dataMessage = new proto.DataMessage()
        dataMessage.setType(proto.MessageType.DATA)
        dataMessage.setBody(topicMessage.getBody_asU8())
        dataMessage.setFromAlias(alias)

        const topicData = dataMessage.serializeBinary()

        // Reliable/unreliable data
        connections.forEach($ => {
          if (ws !== $) {
            if (getTopicList($).has(topic)) {
              $.send(topicData)
            }
          }
        })
      } else if (msgType === proto.MessageType.TOPIC_SUBSCRIPTION) {
        const topicMessage = proto.TopicSubscriptionMessage.deserializeBinary(data)
        const rawTopics = topicMessage.getTopics_asU8()
        const topics = Buffer.from(rawTopics).toString('utf8')
        const set = getTopicList(ws)

        set.clear()
        topics.split(/\s+/g).forEach($ => set.add($))
      }
    })

    ws.on('close', () => connections.delete(ws))

    setTimeout(() => {
      const welcome = new proto.WelcomeMessage()
      welcome.setType(proto.MessageType.WELCOME)
      welcome.setAlias(alias)
      const data = welcome.serializeBinary()

      ws.send(data)
    }, 100)
  })
}
