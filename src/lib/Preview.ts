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
            <script charset="utf-8" src="/dcl-sdk/preview.js"></script>
          </head>
          <body>
          </body>
        </html>
      `)
    })

    // serve the folder `dcl-sdk/artifacts` as `/dcl-sdk`
    this.app.use('/dcl-sdk', express.static(path.dirname(require.resolve('dcl-sdk/artifacts/preview'))))
    this.app.use(express.static(root))
    this.emit('preview:ready', `http://localhost:${port}`)
    this.app.listen(port, '0.0.0.0')
    return this.app
  }
}
