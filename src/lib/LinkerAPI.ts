import * as path from 'path'
import { EventEmitter } from 'events'
import * as express from 'express'
import * as urlParse from 'url'

import * as portfinder from 'portfinder'
import { Project } from './Project'

/**
 * Events emitted by this class:
 *
 * link:ready   - The server is up and running
 * link:success - The IPNS hash was successfully submitted to the blockchain
 * link:error   - The transaction failed and the server was closed
 */
export class LinkerAPI extends EventEmitter {
  private project: Project
  private app = express()
  private landContract: string

  constructor(project: Project, landRegistryContract: string) {
    super()
    this.project = project
    this.landContract = landRegistryContract
  }

  link(port: number) {
    return new Promise(async (resolve, reject) => {
      let resolvedPort = port

      if (!resolvedPort) {
        try {
          resolvedPort = await portfinder.getPortPromise()
        } catch (e) {
          resolvedPort = 4044
        }
      }

      const url = `http://localhost:${resolvedPort}/linker`

      this.setRoutes()

      this.on('link:error', err => {
        reject(err)
      })

      this.app.listen(resolvedPort, () => this.emit('link:ready', url)).on('error', (e: any) => {
        if (e.errno === 'EADDRINUSE') {
          reject(new Error(`Port ${resolvedPort} is already in use by another process`))
        } else {
          reject(new Error(`Failed to start Linker App: ${e.message}`))
        }
      })
    })
  }

  private setRoutes() {
    this.app.get('/linker.js', function(req, res) {
      res.sendFile(path.resolve(__dirname, '../../linker-app/build/src/index.js'))
    })

    this.app.get('/linker', (req, res) => {
      res.writeHead(200, 'OK', {
        'Content-Type': 'text/html'
      })

      res.write(`
        <title>Link scene</title>
        <meta charset="utf-8">
        <body>
          <div id="main">
            <script src="linker.js"></script>
          </div>
        </body>
      `)

      res.end()
    })

    this.app.get('/api/base-parcel', async (req, res) => {
      res.json(await this.project.getParcelCoordinates())
      res.end()
    })

    this.app.get('/api/parcels', async (req, res) => {
      res.json(await this.project.getParcels())
      res.end()
    })

    this.app.get('/api/owner', async (req, res) => {
      const address = await this.project.getOwner()
      res.json({ address })
      res.end()
    })

    this.app.get('/api/ipfs-key', async (req, res) => {
      const projectData = await this.project.getProjectFile()
      res.json(projectData.ipfsKey)
      res.end()
    })

    this.app.get('/api/contract-address', (req, res) => {
      res.json({ address: this.landContract })
      res.end()
    })

    this.app.get('/api/close', (req, res) => {
      res.writeHead(200)
      res.end()

      if (process.env.DEBUG) {
        return
      }

      const { ok, reason } = urlParse.parse(req.url, true).query

      if (ok === 'true') {
        this.emit('link:success')
      } else {
        // we can't throw an error for this one, koa will handle and log it
        this.emit('link:error', new Error(`Failed to link: ${reason}`))
      }
    })
  }
}
