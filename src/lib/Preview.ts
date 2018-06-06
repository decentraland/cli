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
      res.end(`<!DOCTYPE html>
        <html>
          <head>
            <title>Decentraland Preview</title>
            <style>
              html,
              body {
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
                touch-action: none;
              }

              * {
                box-sizing: border-box;
              }

              .babylonVRicon {
                z-index: 9999;
                margin-top: -28px;
              }

              body {
                background: #e3e3e3;
                color: #333;
                font-family: 'open sans', roboto, 'helvetica neue', sans-serif;
                font-size: 0.8em;
              }

              .chatHistory {
                position: absolute;
                bottom: 21px;
                left: 0;
                right: 0;
                z-index: 999999;
                pointer-events: none;
                font-family: monospace;
                padding: 10px;
                font-size: 12pt;
                text-shadow: 0px 0px 1px white;
                color: #000;
              }

              .chatInput {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                font-family: monospace;
                z-index: 999999;
                display: block;
                width: 100%;
                padding: 4px 10px;
                font-size: 12pt;
                border-width: 1px 0 0 0;
                background: transparent;
                outline: none;
              }

              .chatInput:focus {
                outline: inherit;
                background: white;
              }

              canvas {
                position: relative;
                z-index: 1000;
              }

            </style>
          </head>
          <body>
              <script charset="utf-8" src="/metaverse-api/preview.js"></script>
              <script>
                const host = window.location.hostname
                const ws = new WebSocket(\`ws://\${host}:${port}\`)
                ws.addEventListener('message', msg => {
                  if (msg.data === 'update') {
                    handleServerMessage({type: 'update'})
                  }
                })
              </script>
          </body>
        </html>`)
    })

    const artifactPath = path.dirname(path.resolve('node_modules', 'metaverse-api/artifacts/preview'))

    if (!fs.pathExistsSync(artifactPath)) {
      fail(ErrorType.PREVIEW_ERROR, `Couldn\'t find ${artifactPath}, please run: npm install metaverse-api@latest`)
    }

    this.app.use(nocache)
    this.app.use('/metaverse-api', express.static(artifactPath))
    this.app.use(express.static(root))
    this.emit('preview:ready', `http://localhost:${port}`)
    this.server.listen(port)
    return this.app
  }
}
