import path from 'path'
import https from 'https'
import { EventEmitter } from 'events'
import urlParse from 'url'
import fs from 'fs-extra'
import express from 'express'
import cors from 'cors'
import portfinder from 'portfinder'
import { ChainId } from '@dcl/schemas'
import { getPointers } from '@dcl/opscli/dist/commands/pointer-consistency'

import { Project } from './Project'
import { getCustomConfig } from '../config'
import { isDevelopment, isDebug } from '../utils/env'

export type LinkerResponse = {
  address: string
  signature: string
  chainId?: ChainId
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
    return new Promise(async (_resolve, reject) => {
      let resolvedPort = port

      if (!resolvedPort) {
        try {
          resolvedPort = await portfinder.getPortPromise()
        } catch (e) {
          resolvedPort = 4044
        }
      }

      const url = `${
        isHttps ? 'https' : 'http'
      }://localhost:${resolvedPort}/linker`

      this.setRoutes(rootCID)

      this.on('link:error', (err) => {
        reject(err)
      })

      const serverHandler = () => this.emit('link:ready', url)
      const eventHandler = () => (e: any) => {
        if (e.errno === 'EADDRINUSE') {
          reject(
            new Error(
              `Port ${resolvedPort} is already in use by another process`
            )
          )
        } else {
          reject(new Error(`Failed to start Linker App: ${e.message}`))
        }
      }

      if (isHttps) {
        const privateKey = await fs.readFile(
          path.resolve(__dirname, '../../certs/localhost.key'),
          'utf-8'
        )
        const certificate = await fs.readFile(
          path.resolve(__dirname, '../../certs/localhost.crt'),
          'utf-8'
        )
        const credentials = { key: privateKey, cert: certificate }

        const httpsServer = https.createServer(credentials, this.app)
        httpsServer
          .listen(resolvedPort, serverHandler)
          .on('error', eventHandler)
      } else {
        this.app.listen(resolvedPort, serverHandler).on('error', eventHandler)
      }
    })
  }

  private setRoutes(rootCID: string) {
    const linkerDapp = path.resolve(
      __dirname,
      '..',
      '..',
      'node_modules',
      '@dcl/linker-dapp'
    )

    this.app.use(cors())
    this.app.use(express.static(linkerDapp))

    this.app.get('/api/info', async (_, res) => {
      const { LANDRegistry, EstateRegistry } = getCustomConfig()
      const { parcels, base } = (await this.project.getSceneFile()).scene

      res.send({
        baseParcel: base,
        parcels,
        rootCID,
        landRegistry: LANDRegistry,
        estateRegistry: EstateRegistry,
        debug: isDebug()
      })
    })

    this.app.get('/api/files', async (req, res) => {
      const files = (await this.project.getFiles({ cache: true })).map(
        (file) => ({
          name: file.path,
          size: file.size
        })
      )
      res.send(files)
    })

    this.app.get('/api/catalyst-consistency', async (req, res) => {
      const { x, y } = await this.project.getParcelCoordinates()
      const pointer = `${x},${y}`
      const chainId = this.project.getDeployInfo()?.linkerResponse?.chainId || 1
      const network =
        chainId === ChainId.ETHEREUM_MAINNET ? 'mainnet' : 'ropsten'
      const value = await getPointers(pointer, network, { log: false })

      res.send(value)
    })

    this.app.get('/api/close', (req, res) => {
      res.writeHead(200)
      res.end()

      const { ok, reason } = urlParse.parse(req.url, true).query

      if (ok === 'true') {
        const value = JSON.parse(reason?.toString() || '{}') as LinkerResponse
        this.project.setDeployInfo({ linkerResponse: value })
        this.emit('link:success', value)
      }

      if (isDevelopment()) {
        return
      }
      // we can't throw an error for this one, koa will handle and log it
      this.emit('link:error', new Error(`Failed to link: ${reason}`))
    })
  }
}
