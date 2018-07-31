import * as path from 'path'
import { createServer } from 'http'
import * as WebSocket from 'ws'
import * as express from 'express'
import { getRootPath } from '../utils/project'
import { EventEmitter } from 'events'
import * as fs from 'fs-extra'
import { fail, ErrorType } from '../utils/errors'
import * as chokidar from 'chokidar'
import ignore from 'ignore'
import * as portfinder from 'portfinder'
import bodyParser = require('body-parser')
import cors = require('cors')

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
  private ignoredPaths: string

  constructor(ignoredPaths: string) {
    super()
    this.ignoredPaths = ignoredPaths
  }

  async startServer(port: number) {
    const root = getRootPath()
    const ig = ignore().add(this.ignoredPaths)
    let resolvedPort = port

    if (!resolvedPort) {
      try {
        resolvedPort = await portfinder.getPortPromise()
      } catch (e) {
        resolvedPort = 2044
      }
    }

    chokidar.watch(root).on('all', (event, path) => {
      if (!ig.ignores(path)) {
        this.wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send('update')
          }
        })
      }
    })

    this.app.use(cors())

    const artifactPath = path.dirname(path.resolve('node_modules', 'decentraland-api'))

    if (!fs.pathExistsSync(artifactPath)) {
      fail(ErrorType.PREVIEW_ERROR, `Couldn\'t find ${artifactPath}, please run: npm install decentraland-api@latest`)
    }

    this.app.get('/', express.static(path.resolve(artifactPath, 'artifacts/preview.html')))

    this.app.use(nocache)
    this.app.use('/@', express.static(artifactPath))
    this.app.use(express.static(root))

    setUpRendezvous(this.app)

    this.emit('preview:ready', resolvedPort)

    this.server.listen(resolvedPort).on('error', (e: any) => {
      if (e.errno === 'EADDRINUSE') {
        fail(ErrorType.PREVIEW_ERROR, `Port ${resolvedPort} is already in use by another process`)
        fail(ErrorType.PREVIEW_ERROR, `Failed to start Linker App: ${e.message}`)
      }
    })

    return this.app
  }
}

function setUpRendezvous(app: express.Express) {
  /**
   * Store all connections in place
   */
  const connections = []

  /**
   * This middleware sets up Server-Sent Events.
   */
  const sse = (req, res, next) => {
    const connection = {
      uuid: req.params.uuid,
      res: res
    }

    // SSE protocol works by setting the `content-type` to `event-stream`
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })

    // Enrich the response object with the ability to send packets
    res.sseSend = data => {
      try {
        res.write('data: ' + JSON.stringify(data) + '\n\n')
      } catch (e) {
        connections.splice(connections.indexOf(connection), 1)
        clearInterval(res.interval)
      }
    }

    // Setup an interval to keep the connection alive
    res.interval = setInterval(() => {
      res.sseSend({
        type: 'ping'
      })
    }, 5000)

    // Store the connection
    connections.push(connection)

    next()
  }

  app.use(bodyParser.json())

  app.post('/signaling/announce', (req, res) => {
    const uuid = req.body.uuid

    const packet = {
      type: 'announce',
      uuid: uuid
    }

    connections.forEach(c => {
      // Don't announce to self
      if (c.uuid !== uuid) {
        c.res.sseSend(packet)
      }
    })

    res.sendStatus(200)
  })

  app.post('/signaling/:uuid/signal', (req, res) => {
    const uuid = req.params.uuid

    const packet = {
      type: 'signal',
      initiator: req.body.initiator,
      data: req.body.data,
      uuid: req.body.uuid
    }

    let result = false

    connections.forEach(c => {
      if (c.uuid === uuid) {
        c.res.sseSend(packet)
        result = true
      }
    })

    res.sendStatus(result ? 200 : 404)
  })

  app.get('/signaling/:uuid/listen', sse, (_, res) => {
    // tslint:disable-next-line:semicolon
    ;(res as any).sseSend({
      type: 'accept'
    })
  })
}
