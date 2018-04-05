import { EventEmitter } from 'events'
import * as express from 'express'
import { IProjectFile } from '../utils/project'
import * as path from 'path'
import * as urlParse from 'url'

const PORT = 4044

export class LinkerAPI extends EventEmitter {
  private sceneMetadata: DCL.SceneMetadata
  private projectMetadata: IProjectFile
  private app = express()
  private landContract: string

  constructor(sceneMetadata: DCL.SceneMetadata, projectMetadata: IProjectFile, landRegistryContract: string) {
    super()
    this.sceneMetadata = sceneMetadata
    this.projectMetadata = projectMetadata
    this.landContract = landRegistryContract
  }

  link() {
    return new Promise(async (resolve, reject) => {
      const url = `http://localhost:${PORT}/linker`

      this.setRoutes()

      this.on('error', err => {
        reject(err)
      })

      return this.app.listen(PORT, () => this.emit('linker_app_ready', url))
    })
  }

  private setRoutes() {
    this.app.use('/assets', express.static(path.resolve(__dirname, '..')))

    this.app.get('/linker', (req, res) => {
      res.writeHead(200, 'OK', {
        'Content-Type': 'text/html'
      })

      res.write(`
        <title>Link scene</title>
        <meta charset="utf-8">
        <body>
          <div id="main">
            <script src="assets/linker.js"></script>
          </div>
        </body>
      `)

      res.end()
    })

    this.app.get('/api/get-scene-data', (req, res) => {
      res.json(this.sceneMetadata)
      res.end()
    })

    this.app.get('/api/get-ipfs-key', (req, res) => {
      res.json(this.projectMetadata.ipfsKey)
      res.end()
    })

    this.app.get('/api/contract-address', (req, res) => {
      res.json({
        address: this.landContract
      })
      res.end()
    })

    this.app.get('/api/close', (req, res) => {
      res.writeHead(200)
      res.end()

      const { ok, reason } = urlParse.parse(req.url, true).query

      if (ok === 'true') {
        this.emit('link_success')
      } else {
        // we can't throw an error for this one, koa will handle and log it
        this.emit('error', new Error(`Failed to link: ${reason}`))
      }
    })
  }
}
