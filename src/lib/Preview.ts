import * as path from 'path'
import * as express from 'express'
import { getRootPath } from '../utils/project'
import { EventEmitter } from 'events'

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
          </head>
          <body>
          </body>
        </html>
      `)
    })

    this.app.use('/metaverse-api', express.static(path.dirname(path.resolve('node_modules', 'metaverse-api/artifacts/preview'))))
    this.app.use(express.static(root))
    this.emit('preview:ready', `http://localhost:${port}`)
    this.app.listen(port, '0.0.0.0')
    return this.app
  }
}
