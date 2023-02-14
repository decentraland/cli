import path from 'path'
import https from 'https'
import { EventEmitter } from 'events'
import fs from 'fs-extra'
import express, { Express, NextFunction, Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import portfinder from 'portfinder'
import querystring from 'querystring'

export type WorldsContentServerResponse = {
  address: string
  signature: string
}

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

/**
 * Events emitted by this class:
 *
 * link:ready   - The server is up and running
 * link:success - Signature success
 * link:error   - The transaction failed and the server was closed
 */
export class WorldsContentServerLinkerAPI extends EventEmitter {
  private app: AsyncExpress = express() as AsyncExpress

  constructor(private data: any) {
    super()
  }

  link(port: number, isHttps: boolean) {
    return new Promise(async (_resolve, reject) => {
      let resolvedPort = port

      if (!resolvedPort) {
        try {
          resolvedPort = await portfinder.getPortPromise()
        } catch (e) {
          resolvedPort = 4044
        }
      }
      const queryParams = querystring.stringify({ ...this.data })
      console.log({ queryParams })
      const protocol = isHttps ? 'https' : 'http'
      const url = `${protocol}://localhost:${resolvedPort}`

      this.setRoutes()

      this.on('link:error', (err) => {
        reject(err)
      })

      const serverHandler = () =>
        this.emit('link:ready', { url, params: queryParams })
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

  private setRoutes() {
    const linkerDapp = path.dirname(
      require.resolve('@dcl/linker-dapp/package.json')
    )
    // console.log({ linkerDapp, m: path.join(linkerDapp, 'build') })
    this.app.use(cors())
    // this.app.use('/world-acl', express.static(linkerDapp))
    this.app.use(express.static(linkerDapp + '/build'))
    this.app.use('/acl', express.static(linkerDapp + '/build'))
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

    this.app.asyncGet('/api/acl', async () => {
      return await this.data
    })

    this.app.asyncPost('/api/acl', (req) => {
      type Body = {
        address: string
        signature: string
      }
      const value = req.body as Body

      if (!value.address || !value.signature) {
        throw new Error(`Invalid payload: ${Object.keys(value).join(' - ')}`)
      }

      // this.project.setDeployInfo({ linkerResponse: value, status: 'deploying' })
      this.emit('link:success', value)
      // this.emit('link:error', new Error(`Failed to link: ${reason}`))
    })
  }
}
