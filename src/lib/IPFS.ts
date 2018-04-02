import { env } from 'decentraland-commons'
import axios from 'axios'
import { EventEmitter } from 'events'
import { isDev } from '../utils/env'
const ipfsAPI = require('ipfs-api')

env.load()

export interface IIPFSFile {
  path: string
  content: Buffer
}

export class IPFS extends EventEmitter {
  private ipfsApi: any

  constructor(host: string = 'localhost', port: number = 5001) {
    super()
    this.ipfsApi = ipfsAPI('localhost', port.toString())
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
      throw new Error(`Unable to connect to the IPFS daemon: ${e.message}`)
    }
  }

  /**
   * Adds files to the local IPFS node, pins them and then publishs them.
   * @param coords An object containing the base X and Y coordinates for the parcel.
   * @param files An array of objects containing the path and content for the files.
   * @param projectId The uuid generated for the project.
   * @param hasKey A flag that should be set to `false` when running for the first time.
   */
  async upload(
    coords: { x: number; y: number },
    files: IIPFSFile[],
    projectId: string,
    hasKey: boolean = false
  ): Promise<void> {
    const peerId = await this.getPeerId()
    const filesAdded = await this.addFiles(files, (p: number) => this.emit('add_progress', p))
    this.emit('add_complete')

    if (hasKey) {
      const rootFolder = filesAdded[filesAdded.length - 1]
      await this.pinFiles(peerId, coords)
      await this.publish(projectId, `/ipfs/${rootFolder.hash}`)

      this.emit('done')
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
      throw new Error(`Unable to connect to the IPFS daemon: ${e.message}`)
    }
  }

  /**
   * Notifies an external IPFS node to pin the local files.
   * @param peerId The peerId of the local IPFS node.
   * @param coords An object containing the base X and Y coordinates for the parcel.
   */
  async pinFiles(peerId: string, coords: { x: number; y: number }) {
    const { x, y } = coords
    const ipfsURL: string = await this.getExternalURL()

    this.emit('pin')

    try {
      await axios.post(`${ipfsURL}/pin/${peerId}/${x}/${y}`)
    } catch (e) {
      if (e.response) {
        throw new Error('Failed to pin files: ' + e.response.data.error || e.response.data)
      }
      throw new Error('Failed to pin files: ' + e.message)
    }

    this.emit('pin_complete')
  }

  /**
   * Fetches Decentraland's IPFS node URL.
   */
  private async getExternalURL() {
    let ipfsURL: string = null

    try {
      const { data } = await axios.get('https://decentraland.github.io/ipfs-node/url.json?v1')
      if (isDev) {
        ipfsURL = data.staging
      } else {
        ipfsURL = data.production
      }
    } catch (error) {
      // fallback to ENV
    }

    return env.get('IPFS_GATEWAY', () => ipfsURL)
  }

  /**
   * Publishes the IPNS for the project based on its IPFS key.
   * @param projectId The uuid generated for the project.
   * @param ipfsHash The hash of the root directory to be published.
   */
  private async publish(projectId: string, ipfsHash: string): Promise<string> {
    this.emit('publish')

    try {
      const { name } = await this.ipfsApi.name.publish(ipfsHash, { key: projectId })
      this.emit('publish_complete')

      return name
    } catch (e) {
      throw new Error(`Failed to publish: ${e.message}`)
    }
  }

  /**
   * Adds file to the local IPFS node.
   * @param files An array of objects containing the path and content for the files.
   * @param onProgress A callback function to be called for each file uploaded (receives the total amount of bytes uploaded as an agument).
   */
  private async addFiles(files: IIPFSFile[], onProgress: (p: number) => void): Promise<any> {
    if (files.length === 0) {
      throw new Error('Unable to upload files: no files available (check your .dclignore rules)')
    }

    try {
      return this.ipfsApi.files.add(files, {
        progress: onProgress,
        recursive: true
      })
    } catch (e) {
      throw new Error(`Unable to connect to the IPFS daemon: ${e.message}`)
    }
  }
}
