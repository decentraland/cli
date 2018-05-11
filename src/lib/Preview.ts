import * as path from 'path'
import { createServer } from 'http'
import * as WebSocket from 'ws'
import * as express from 'express'
import { getRootPath } from '../utils/project'
import { EventEmitter } from 'events'
import * as fs from 'fs-extra'
import { fail, ErrorType } from '../utils/errors'
import * as chokidar from 'chokidar'
import ignore = require('ignore')

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

  startServer(port: number = 2044) {
    const root = getRootPath()
    const ig = ignore().add(this.ignoredPaths)

    chokidar.watch(root).on('all', (event, path) => {
      if (!ig.ignores(path)) {
        this.wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send('update')
          }
        })
      }
    })

    this.app.get('/', (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Decentraland Preview</title>
            <script charset="utf-8" src="/metaverse-api/preview.js"></script>
            <style>
              body {
                margin: 0px;
              }
            </style>
          </head>
          <body>
              <script>
                const host = window.location.hostname
                const ws = new WebSocket(\`ws://\${host}:${port}\`, ['soap', 'xmpp'])
                
                ws.addEventListener('message', (msg) => {
                  if (msg.data === 'update') {
                    location.reload()
                  }
                })
              </script>
          </body>
        </html>
      `)
    })

    const artifactPath = path.dirname(path.resolve('node_modules', 'metaverse-api/artifacts/preview'))

    if (!fs.pathExistsSync(artifactPath)) {
      fail(ErrorType.PREVIEW_ERROR, `Couldn\'t find ${artifactPath}, please run: npm install metaverse-api@latest`)
    }

    this.app.use('/metaverse-api', express.static(artifactPath))
    this.app.use(express.static(root))
    this.emit('preview:ready', `http://localhost:${port}`)
    this.server.listen(port)
    return this.app
  }
}
