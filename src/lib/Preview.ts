import * as path from 'path'
import * as express from 'express'
import { getRootPath } from '../utils/project'

export class Preview {
  // TODO (dani): Use Koa or Express, not both..
  private app = express()

  startServer() {
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
    this.app.listen(2044, '0.0.0.0')
    return this.app
  }
}
