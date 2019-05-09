import * as path from 'path'
import * as https from 'https'
import { EventEmitter } from 'events'
import * as urlParse from 'url'
import * as fs from 'fs-extra'
import * as express from 'express'
import * as portfinder from 'portfinder'

import { Project } from './Project'
import { Network } from './Ethereum'
import { getCustomConfig } from '../config'
import { isDevelopment } from '../utils/env'

export type LinkerResponse = {
  address: string
  signature: string
  network: Network
}

/**
 * Events emitted by this class:
 *
 * link:ready   - The server is up and running
 * link:success - Signatire success
 * link:error   - The transaction failed and the server was closed
 */
export class LinkerAPI extends EventEmitter {
  private project: Project
  private app = express()

  constructor(project: Project) {
    super()
    this.project = project
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
        const privateKey = await fs.readFile(
          path.resolve(__dirname, '../certs/localhost.key'),
          'utf-8'
        )
        const certificate = await fs.readFile(
          path.resolve(__dirname, '../certs/localhost.crt'),
          'utf-8'
        )
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
      res.sendFile(path.resolve(__dirname, '../linker-app/src/index.js'))
    })

    this.app.get('/linker', async (req, res) => {
      res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })

      const baseParcel = await this.project.getParcelCoordinates()
      const parcels = await this.project.getParcels()

      const { MANAToken, LANDRegistry, EstateRegistry } = getCustomConfig()

      res.write(`
        <head>
          <title>Link scene</title>
          <meta charset="utf-8">
          <link href="css/styles.css" rel="stylesheet" />
          <link href="css/dark-theme.css" rel="stylesheet" />
        </head>
        <body>
          <div id="main">
            <script src="linker.js"
              env=${isDevelopment() ? 'dev' : 'prod'}
              ${MANAToken ? `mana-token=${MANAToken}` : null}
              ${LANDRegistry ? `land-registry=${LANDRegistry}` : null}
              ${EstateRegistry ? `estate-registry=${EstateRegistry}` : null}
              base-parcel=${JSON.stringify(baseParcel)}
              parcels=${JSON.stringify(parcels)}
              root-cid=${rootCID}>
            </script>
          </div>
        </body>
      `)

      res.end()
    })

    this.app.get('/css/styles.css', (req, res) => {
      const filePath = path.resolve(__dirname, '../css/decentraland-ui-styles.css')
      res.sendFile(filePath)
    })

    this.app.get('/css/dark-theme.css', (req, res) => {
      const filePath = path.resolve(__dirname, '../css/decentraland-ui-dark-theme.css')
      res.sendFile(filePath)
    })

    this.app.get('/css/logo.svg', (req, res) => {
      const filePath = path.resolve(__dirname, '../css/logo.svg')
      res.sendFile(filePath)
    })

    this.app.get('/api/close', (req, res) => {
      res.writeHead(200)
      res.end()

      const { ok, reason } = urlParse.parse(req.url, true).query

      if (ok === 'true') {
        console.log(reason)
        this.emit('link:success', JSON.parse(reason.toString()) as LinkerResponse)
      }

      if (isDevelopment()) {
        return
      }
      // we can't throw an error for this one, koa will handle and log it
      this.emit('link:error', new Error(`Failed to link: ${reason}`))
    })
  }
}
