import path from 'path'
import https from 'https'
import { EventEmitter } from 'events'
import fs from 'fs-extra'
import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import portfinder from 'portfinder'
import { ChainId } from '@dcl/schemas'
import urlParse from 'url'

import { getPointers } from '../utils/catalystPointers'
import { Project } from './Project'
import { getCustomConfig } from '../config'
import { isDebug } from '../utils/env'

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

type Route = (
  path: string,
  fn: (
    req: Request,
    resp?: Response,
    next?: NextFunction
  ) =>
    | Promise<void | Record<string, unknown> | unknown[]>
    | void
    | Record<string, unknown>
    | unknown[]
) => void

type Async = 'async'
type Method = 'get' | 'post'
type AsyncMethod = `${Async}${Capitalize<Method>}`

type AsyncExpress = Express & {
  [key in AsyncMethod]: Route
}

export class LinkerAPI extends EventEmitter {
  private project: Project
  private app: AsyncExpress = express() as AsyncExpress

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

      const url = `${isHttps ? 'https' : 'http'}://localhost:${resolvedPort}`

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
    this.app.use(bodyParser.json())

    /**
     * Async method to try/catch errors
     */
    const methods: Capitalize<Method>[] = ['Get', 'Post']
    for (const method of methods) {
      const asyncMethod: AsyncMethod = `async${method}`
      this.app[asyncMethod] = async (path, fn) => {
        const originalMethod = method.toLocaleLowerCase() as Method
        this.app[originalMethod](path, async (req, res) => {
          try {
            const resp = await fn(req, res)
            res.send(resp || {})
          } catch (e) {
            console.log(e)
            res.send(e)
          }
        })
      }
    }

    this.app.asyncGet('/api/info', async () => {
      const { LANDRegistry, EstateRegistry } = getCustomConfig()
      const {
        scene: { parcels, base },
        display
      } = await this.project.getSceneFile()

      return {
        baseParcel: base,
        parcels,
        rootCID,
        landRegistry: LANDRegistry,
        estateRegistry: EstateRegistry,
        debug: isDebug(),
        title: display?.title,
        description: display?.description
      }
    })

    this.app.asyncGet('/api/files', async () => {
      const files = (await this.project.getFiles({ cache: true })).map(
        (file) => ({
          name: file.path,
          size: file.size
        })
      )

      return files
    })

    this.app.asyncGet('/api/catalyst-pointers', async () => {
      const { x, y } = await this.project.getParcelCoordinates()
      const pointer = `${x},${y}`
      const chainId = this.project.getDeployInfo()?.linkerResponse?.chainId || 1
      const network =
        chainId === ChainId.ETHEREUM_MAINNET ? 'mainnet' : 'ropsten'
      const value = await getPointers(pointer, network)

      return {
        catalysts: value,
        status: this.project.getDeployInfo().status ?? ''
      }
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

      this.emit('link:error', new Error(`Failed to link: ${reason}`))
    })

    this.app.asyncPost('/api/deploy', (req) => {
      type Body = {
        address: string
        signature: string
        chainId: ChainId
      }
      const value = req.body as Body

      if (!value.address || !value.signature || !value.chainId) {
        throw new Error(`Invalid payload: ${Object.keys(value).join(' - ')}`)
      }

      this.project.setDeployInfo({ linkerResponse: value, status: 'deploying' })
      this.emit('link:success', value)
      // this.emit('link:error', new Error(`Failed to link: ${reason}`))
    })
  }
}
