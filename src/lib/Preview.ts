import * as path from 'path'
import { createServer } from 'http'
import * as WebSocket from 'ws'
import * as express from 'express'
import { EventEmitter } from 'events'
import * as fs from 'fs-extra'
import * as portfinder from 'portfinder'
import * as proto from './proto/broker'

import * as cors from 'cors'
import * as spinner from '../utils/spinner'

import { fail, ErrorType } from '../utils/errors'
import { Watcher } from './Watcher'

type Decentraland = import('./Decentraland').Decentraland

function nocache(req, res, next) {
  res.setHeader('Surrogate-Control', 'no-store')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
}

/**
 * Events emitted by this class:
 *
 * preview:ready - The server is up and running
 */
export class Preview extends EventEmitter {
  private app = express()
  private server = createServer(this.app)
  private wss = new WebSocket.Server({ server: this.server })

  constructor(public dcl: Decentraland, private ignoredPaths: string, private watch: boolean) {
    super()
  }

  async startServer(port: number) {
    let resolvedPort = port

    if (!resolvedPort) {
      try {
        resolvedPort = await portfinder.getPortPromise()
      } catch (e) {
        resolvedPort = 2044
      }
    }

    const watcher = new Watcher(this.dcl.getWorkingDir(), this.ignoredPaths || '')

    watcher.onProcessingComplete.push(() => {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send('update')

          client.send(
            JSON.stringify({
              type: 'update'
            })
          )
        }
      })
    })

    spinner.create('Hashing files')

    try {
      await watcher.initialMappingsReady
      spinner.succeed('Hashing files')
    } catch (e) {
      spinner.fail('Hashing files')
      throw e
    }

    if (this.watch) {
      watcher.watch()
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

    this.app.use(nocache)

    this.app.get('/mappings', (_, res) => {
      res.json(watcher.getMappings())
    })

    this.app.get('/scenes', async (_, res) => {
      const mapping = watcher.getMappings()[0]
      const { parcel_id, root_cid, publisher } = mapping
      return res.json({ data: [{ parcel_id, root_cid, publisher, scene_cid: '' }] })
    })

    this.app.get('/parcel_info', (_, res) => {
      const mapping = watcher.getMappings()[0]
      const { parcel_id, root_cid, publisher } = mapping
      return res.json({
        data: [
          {
            parcel_id,
            root_cid,
            publisher,
            scene_cid: '',
            content: mapping
          }
        ]
      })
    })

    this.app.get('/scene.json', (_, res) => {
      res.sendFile(path.join(this.dcl.getWorkingDir(), 'scene.json'))
    })

    this.app.use(express.static(path.join(artifactPath, 'artifacts')))

    this.app.get('/Qm:cid', (req, res) => {
      const file = watcher.resolveCID('Qm' + req.params.cid)

      if (file) {
        res.sendFile(file)
      } else {
        res.sendStatus(404)
      }
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
      welcome.setAlias(++connectionCounter)
      const data = welcome.serializeBinary()

      ws.send(data)
    }, 100)
  })
}
