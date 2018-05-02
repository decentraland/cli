import * as path from 'path'
import * as express from 'express'
import { getRootPath } from '../utils/project'
import { EventEmitter } from 'events'
import * as fs from 'fs-extra'
import { fail, ErrorType } from '../utils/errors'

/**
 * Events emitted by this class:
 *
 * preview:ready - The server is up and running
 */
export class Preview extends EventEmitter {
  private app = express()

  startServer(port: number = 2044) {
    const root = getRootPath()

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
    this.app.listen(port, '0.0.0.0')
    return this.app
  }
}
