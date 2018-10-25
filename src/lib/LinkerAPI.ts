import * as path from 'path'
import * as fs from 'fs-extra'
import * as https from 'https'
import { EventEmitter } from 'events'
import * as urlParse from 'url'
import * as express from 'express'
import * as portfinder from 'portfinder'

import { Project } from './Project'
import { getProvider } from '../utils/env'

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
  private manaContract: string
  private estateContract: string

  constructor(project: Project, manaTokenContract: string, landRegistryContract: string, estateRegistryContract: string) {
    super()
    this.project = project
    this.manaContract = manaTokenContract
    this.landContract = landRegistryContract
    this.estateContract = estateRegistryContract
  }

  link(port: number, isHttps: boolean, rootCID: string) {
    return new Promise(async (resolve, reject) => {
      let resolvedPort = port

      if (!resolvedPort) {
        try {
          resolvedPort = await portfinder.getPortPromise()
        } catch (e) {
          resolvedPort = 4044
        }
      }

      const url = `${isHttps ? 'https' : 'http'}://localhost:${resolvedPort}/linker`

      this.setRoutes(rootCID)

      this.on('link:error', err => {
        reject(err)
      })

      const serverHandler = () => this.emit('link:ready', url)
      const eventHandler = () => (e: any) => {
        if (e.errno === 'EADDRINUSE') {
          reject(new Error(`Port ${resolvedPort} is already in use by another process`))
        } else {
          reject(new Error(`Failed to start Linker App: ${e.message}`))
        }
      }

      if (isHttps) {
        const privateKey = await fs.readFile(path.resolve(__dirname, '../certs/localhost.key'), 'utf-8')
        const certificate = await fs.readFile(path.resolve(__dirname, '../certs/localhost.crt'), 'utf-8')
        const credentials = { key: privateKey, cert: certificate }

        const httpsServer = https.createServer(credentials, this.app)
        httpsServer.listen(resolvedPort, serverHandler).on('error', eventHandler)
      } else {
        this.app.listen(resolvedPort, serverHandler).on('error', eventHandler)
      }
    })
  }

  private setRoutes(rootCID: string) {
    this.app.get('/linker.js', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../../linker-app/build/src/index.js'))
    })

    this.app.get('/linker', async (req, res) => {
      res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })

      const baseParcel = await this.project.getParcelCoordinates()
      const parcels = await this.project.getParcels()
      const owner = await this.project.getOwner()
      const { ipfsKey } = await this.project.getProjectFile()
      const estateId = await this.project.getEstate()

      res.write(`
        <head>
          <title>Link scene</title>
          <meta charset="utf-8">
          <link href="https://ui.decentraland.org/styles.css" rel="stylesheet" />
          <link href="https://ui.decentraland.org/dark-theme.css" rel="stylesheet" />
        </head>
        <body>
          <div id="main">
            <script src="linker.js" env=${process.env.DCL_ENV} mana-contract=${this.manaContract} land-contract=${this.landContract}
              estate-contract=${this.estateContract} base-parcel=${JSON.stringify(baseParcel)} parcels=${JSON.stringify(parcels)}
              estate-id=${estateId} owner=${owner} ipfs-key=${ipfsKey} provider=${getProvider()} root-cid=${rootCID}></script>
          </div>
        </body>
      `)

      res.end()
    })

    this.app.get('/api/close', (req, res) => {
      res.writeHead(200)
      res.end()

      const { ok, reason } = urlParse.parse(req.url, true).query

      if (ok === 'true') {
        this.emit('link:success', reason)
      }

      if (process.env.DEBUG) {
        return
      }
      // we can't throw an error for this one, koa will handle and log it
      this.emit('link:error', new Error(`Failed to link: ${reason}`))
    })
  }
}
