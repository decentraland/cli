import { EventEmitter } from 'events'

import { ContentClient, ParcelInformation } from './ContentClient'
import { IFile } from '../Project'
import { CIDUtils } from './CIDUtils'
import { ContentUploadRequest, RequestMetadata, ContentIdentifier } from './ContentUploadRequest'
import { Coords } from '../../utils/coordinateHelpers'
import { fail, ErrorType } from '../../utils/errors'
import { SceneMetadata } from '../../config'

const SCENE_FILE = 'scene.json'

export class ContentService extends EventEmitter {
  client: ContentClient

  constructor(client: ContentClient) {
    super()
    this.client = client
  }

  /**
   * Upload content to the content server
   *
   * @param rootCID CID of the content about to upload
   * @param content Files to upload
   * @param contentSignature Signed RootCID
   */
  async uploadContent(
    rootCID: string,
    content: IFile[],
    contentSignature: string,
    address: string,
    fullUpload: boolean,
    timestamp: number,
    userId: string
  ): Promise<boolean> {
    this.emit('upload:starting')
    const manifest: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile(content)
    const metadata: RequestMetadata = this.buildMetadata(
      rootCID,
      contentSignature,
      address,
      timestamp,
      userId
    )

    let uploadContent = content
    if (!fullUpload) {
      uploadContent = await this.filterUploadedContent(content, manifest)
    }

    const result = await this.client.uploadContent(
      new ContentUploadRequest(rootCID, uploadContent, manifest, metadata)
    )

    if (result.success) {
      this.emit('upload:success')
    } else {
      this.emit('upload:failed', result.errorMessage)
    }
    return result.success
  }

  /**
   * Retrives the uploaded content information by a given Parcel (x y coordinates)
   * @param x
   * @param y
   */
  async getParcelStatus(coordinates: Coords): Promise<ParcelInformation> {
    const response = await this.client.getParcelsInformation(coordinates, coordinates)
    if (response.ok) {
      return response.data.length > 0 ? response.data[0] : null
    }
    fail(
      ErrorType.CONTENT_SERVER_ERROR,
      `Error retrieving parcel ${coordinates.x},${coordinates.y} information: ${
        response.errorMessage
      }`
    )
  }

  /**
   * Retrives the content of the scene.json file from the content-server
   * @param x
   * @param y
   */
  async getSceneData(coordinates: Coords): Promise<SceneMetadata> {
    const information: ParcelInformation = await this.getParcelStatus(coordinates)

    if (!information) {
      return null
    }

    const sceneFileCID = information.contents[SCENE_FILE]
    if (!sceneFileCID) {
      return null
    }

    return this.client.getContent(sceneFileCID)
  }

  private buildMetadata(
    rootCID: string,
    signature: string,
    address: string,
    timestamp: number,
    userId: string
  ): RequestMetadata {
    const validity = new Date()
    validity.setMonth(validity.getMonth() + 6)
    return {
      value: rootCID,
      signature,
      pubKey: address.toLowerCase(),
      validityType: 0,
      validity,
      sequence: 2,
      timestamp,
      userId
    }
  }

  private async filterUploadedContent(
    files: IFile[],
    manifest: ContentIdentifier[]
  ): Promise<IFile[]> {
    const cidMaps = manifest.reduce((map, obj) => ((map[obj.name] = obj.cid), map), {})
    const res = await this.client.checkContentStatus(Object.values(cidMaps))
    return files.filter(f => {
      if (f.path === 'scene.json') {
        return true
      }
      const cid = cidMaps[f.path]
      const uploaded = res[cid]
      return !uploaded
    })
  }
}
