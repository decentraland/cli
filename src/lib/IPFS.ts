import * as fetch from 'isomorphic-fetch'
import { EventEmitter } from 'events'
import { isDev } from '../utils/env'
import { fail, ErrorType } from '../utils/errors'
import { IFile } from './Project'
const ipfsAPI = require('ipfs-api')

export interface IResolveDependency {
  src: string
  ipfs: string
  name: string
  size?: number
  contentType?: string
  path: string
}

export interface IResolveResponse {
  ok: boolean
  url: {
    ipns: string
    ipfs: string
    lastModified: string
    dependencies: IResolveDependency[]
  }
}

/**
 * Events emitted by this class:
 *
 * ipfs:pin             - A request for another IPFS node to pin the local files
 * ipfs:pin-success     - The project was successfully pinned by an external node
 * ipfs:add             - Began uploading files to local IPFS node
 * ipfs:add-success     - The files were successfully added to the local IPFS node
 * ipfs:publish         - A request to publish an IPNS hash
 * ipfs:publish-success - The IPNS hash was successfully published
 */
export class IPFS extends EventEmitter {
  private ipfsApi: any
  private gateway: string

  constructor(host: string = 'localhost', port: number = 5001) {
    super()
    this.ipfsApi = ipfsAPI(host, port.toString())
    if (process.env.IPFS_GATEWAY) {
      this.gateway = process.env.IPFS_GATEWAY
    }
  }

  /**
   * Generates a new IPFS key (IPNS) and returns it.
   * @param projectId The uuid generated for the project.
   */
  async genIPFSKey(projectId: string): Promise<string> {
    try {
      const { id } = await this.ipfsApi.key.gen(projectId, { type: 'rsa', size: 2048 })
      return id
    } catch (e) {
      fail(
        ErrorType.IPFS_ERROR,
        `Unable to connect to the IPFS daemon, make sure it is running: https://ipfs.io/docs/getting-started\n${e.message}`
      )
    }
  }

  /**
   * Returns the peerId from the IPFS api.
   */
  async getPeerId(): Promise<string> {
    try {
      const { id } = await this.ipfsApi.id()
      return id
    } catch (e) {
      fail(
        ErrorType.IPFS_ERROR,
        `Unable to connect to the IPFS daemon, make sure it is running: https://ipfs.io/docs/getting-started\n${e.message}`
      )
    }
  }

  /**
   * Notifies an external IPFS node to pin the local files.
   * @param peerId The peerId of the local IPFS node.
   * @param coords An object containing the base X and Y coordinates for the parcel.
   */
  async pinFiles(peerId: string, coords: { x: number; y: number }, ipfsHash?: string) {
    const { x, y } = coords
    const ipfsURL: string = await this.getExternalURL()

    this.emit('ipfs:pin')

    try {
      const res = await fetch(`${ipfsURL}/pin/${x}/${y}`, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          peerId,
          ipfs: ipfsHash
        })
      })
      if (res.status >= 400 && res.status < 600) {
        const data = res.json ? await res.json() : null
        throw new Error(data ? data.error : JSON.stringify(res))
      }
    } catch (e) {
      fail(ErrorType.IPFS_ERROR, 'Failed to pin files: ' + e.message)
    }

    this.emit('ipfs:pin-success')
  }

  /**
   * Adds file to the local IPFS node.
   * @param files An array of objects containing the path and content for the files.
   * @param onProgress A callback function to be called for each file uploaded (receives the total amount of bytes uploaded as an agument).
   */
  async addFiles(files: IFile[]): Promise<{ path: string; hash: string; size: number }[]> {
    const ipfsFiles = files.map(file => {
      return { path: `/tmp/${file.path}`, content: file.content }
    })

    if (ipfsFiles.length === 0) {
      fail(ErrorType.IPFS_ERROR, 'Unable to upload files: no files available (check your .dclignore rules)')
    }

    this.emit('ipfs:add')

    try {
      const res = await this.ipfsApi.files.add(ipfsFiles, {
        recursive: true
      })

      this.emit('ipfs:add-success')

      return res
    } catch (e) {
      fail(
        ErrorType.IPFS_ERROR,
        `Unable to connect to the IPFS daemon, make sure it is running: https://ipfs.io/docs/getting-started\n${e.message}`
      )
    }
  }

  /**
   * Publishes the IPNS for the project based on its IPFS key.
   * @param projectId The uuid generated for the project.
   * @param ipfsHash The hash of the root directory to be published.
   */
  async publish(projectId: string, ipfsHash: string): Promise<string> {
    this.emit('ipfs:publish', ipfsHash)

    if (!ipfsHash) {
      fail(ErrorType.IPFS_ERROR, 'Failed to publish: missing IPFS hash')
    }

    try {
      const { name } = await this.ipfsApi.name.publish(ipfsHash, { key: projectId })
      this.emit('ipfs:publish-success', name)
      return name
    } catch (e) {
      if (e.message && e.message.contains('failed to find any peer in table')) {
        fail(ErrorType.IPFS_ERROR, `Failed to publish: ${e.message} (try restarting your IPFS daemon)`)
      }
      fail(ErrorType.IPFS_ERROR, `Failed to publish: ${e.message}`)
    }
  }

  /**
   * Emit key-success event
   */
  genKeySuccess() {
    this.emit('ipfs:key-success')
  }

  async resolveParcel(x: number, y: number): Promise<IResolveResponse> {
    const url = await this.getExternalURL()
    const raw = await fetch(url + `/resolve/${x}/${y}`)
    let response
    try {
      response = (await raw.json()) as IResolveResponse
    } catch (e) {
      response = null
    }
    return response
  }

  async getDeployedFiles(x: number, y: number): Promise<IResolveDependency[]> {
    const res = await this.resolveParcel(x, y)
    return res && res.url && res.url.dependencies.length ? res.url.dependencies : []
  }

  async getRemoteSceneMetadata(x: number, y: number): Promise<DCL.SceneMetadata> {
    const url = await this.getExternalURL()
    const resolvedParcel = await this.resolveParcel(x, y)
    if (resolvedParcel && resolvedParcel.url) {
      const raw = await fetch(url + `/get/${resolvedParcel.url.ipfs}/scene.json`)
      const res = (await raw.json()) as DCL.SceneMetadata
      return res
    }
    return null
  }

  /**
   * Fetches Decentraland's IPFS node URL.
   */
  private async getExternalURL(): Promise<string> {
    let ipfsURL: string = this.gateway

    if (ipfsURL) {
      return ipfsURL
    }

    try {
      const raw = await fetch('https://decentraland.github.io/ipfs-node/url.json')
      const data = (await raw.json()) as { staging: string; production: string }
      if (isDev) {
        ipfsURL = data.staging
      } else {
        ipfsURL = data.production
      }
    } catch (error) {
      // fallback to ENV
    }

    this.gateway = ipfsURL

    return ipfsURL
  }
}
