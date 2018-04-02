import { EventEmitter } from 'events'
import * as Koa from 'koa'
import * as Router from 'koa-router'
import axios from 'axios'
import { IProjectFile } from '../utils/project'
import * as serve from 'koa-static'
import * as path from 'path'
import { env } from 'decentraland-commons'
import * as urlParse from 'url'

export class LinkerAPI extends EventEmitter {
  private sceneMetadata: DCL.SceneMetadata
  private projectMetadata: IProjectFile
  private app: Koa
  private router: Router
  private landContract: string

  constructor(sceneMetadata: DCL.SceneMetadata, projectMetadata: IProjectFile, landRegistryContract: string) {
    super()
    this.sceneMetadata = sceneMetadata
    this.projectMetadata = projectMetadata
    this.app = new Koa()
    this.router = new Router()
    this.landContract = landRegistryContract
  }

  link() {
    return new Promise(async (resolve, reject) => {
      const url = 'http://localhost:4044/linker'
      this.app.use(serve(path.resolve(__dirname, '..', 'linker-app')))
      this.app.use(async (ctx, next) => {
        ctx.res.statusCode = 200
        await next()
      })

      this.setRoutes()

      this.app.use(async (ctx, next) => {
        try {
          await next()
        } catch (err) {
          throw err
        }
      })

      this.on('error', err => {
        reject(err)
      })

      this.app.use(this.router.routes())

      return this.app.listen(4044, () => this.emit('linker_app_ready', url))
    })
  }

  private setRoutes() {
    this.router.get('/api/get-scene-data', ctx => {
      ctx.body = this.sceneMetadata
    })

    this.router.get('/api/get-ipfs-key', ctx => {
      ctx.body = JSON.stringify(this.projectMetadata.ipfsKey)
    })

    this.router.get('/api/contract-address', async ctx => {
      ctx.body = JSON.stringify({
        address: this.landContract
      })
    })

    this.router.get('/api/close', ctx => {
      ctx.res.end()

      const { ok, reason } = urlParse.parse(ctx.req.url, true).query

      if (ok === 'true') {
        this.emit('link_success')
      } else {
        // we can't throw an error for this one, koa will handle and log it
        this.emit('error', new Error(`Failed to link: ${reason}`))
      }
    })

    this.router.get('*', ctx => {
      ctx.respond = false
    })
  }
}
