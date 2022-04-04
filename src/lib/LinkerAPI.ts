import path from 'path'
import https from 'https'
import { EventEmitter } from 'events'
import urlParse from 'url'
import fs from 'fs-extra'
import express from 'express'
import portfinder from 'portfinder'
import querystring from 'querystring'
import { sdk } from '@dcl/schemas'

import { Project } from './Project'
import { getCustomConfig } from '../config'
import { isDevelopment, isDebug } from '../utils/env'

import { LinkerResponse } from '@dcl/linker-dapp/types/modules/server/utils'

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

    this.app.use(express.static(linkerDapp))

    this.app.get('/linker', async (_, res) => {
      if (
        this.project.getInfo().sceneType === sdk.ProjectType.PORTABLE_EXPERIENCE
      ) {
        const wearableId = this.project.getInfo().sceneId
        const query = querystring.stringify({
          wearableId,
          debug: isDebug()
        })
        res.redirect(`/?${query}`)
      } else {
        const { LANDRegistry, EstateRegistry } = getCustomConfig()
        const { parcels, base: baseParcel } = (
          await this.project.getSceneFile()
        ).scene
        const query = querystring.stringify({
          baseParcel,
          parcels,
          rootCID,
          landRegistry: LANDRegistry,
          estateRegistry: EstateRegistry,
          debug: isDebug()
        })
        res.redirect(`/?${query}`)
      }
    })

    this.app.get('/api/address_info', (req, res) => {
      res.writeHead(200)
      res.end()
      const { address } = urlParse.parse(req.url, true).query
      this.emit('link:address', address)
    })

    this.app.get('/api/close', (req, res) => {
      res.writeHead(200)
      res.end()

      const { ok, reason } = urlParse.parse(req.url, true).query

      if (ok === 'true') {
        this.emit(
          'link:success',
          JSON.parse(reason.toString()) as LinkerResponse
        )
      }

      if (isDevelopment()) {
        return
      }
      // we can't throw an error for this one, koa will handle and log it
      this.emit('link:error', new Error(`Failed to link: ${reason}`))
    })
  }
}
