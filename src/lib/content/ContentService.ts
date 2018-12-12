import { EventEmitter } from 'events'

import { ContentClient, ParcelInformation } from './ContentClient'
import { IFile } from '../Project'
import { CIDUtils } from './CIDUtils'
import { ContentUploadRequest, RequestMetadata, ContentIdentifier } from './ContentUploadRequest'
import { Coords } from '../../utils/coordinateHelpers'
import { fail, ErrorType } from '../../utils/errors'

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
  async uploadContent(rootCID: string, content: IFile[], contentSignature: string, address: string, fullUpload: boolean): Promise<boolean> {
    this.emit('upload:starting')
    const manifest: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile(content)
    const metadata: RequestMetadata = await this.buildMetadata(rootCID, contentSignature, address)

    let uploadContent = content
    if (!fullUpload) {
      uploadContent = await this.filterUploadedContent(content, manifest)
    }

    const response = await this.client.uploadContent(new ContentUploadRequest(rootCID, uploadContent, manifest, metadata))

    if (response.statusCode === 200) {
      this.emit('upload:success')
      return true
    }
    this.emit('upload:failed', JSON.stringify(response.body))
    return false
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
    fail(ErrorType.CONTENT_SERVER_ERROR, `Error retrieving parcel ${coordinates.x},${coordinates.y} information: ${response.errorMessage}`)
  }

  /**
   * Retrives the content of the scene.json file from the content-server
   * @param x
   * @param y
   */
  async getSceneData(coordinates: Coords): Promise<DCL.SceneMetadata> {
    const information: ParcelInformation = await this.getParcelStatus(coordinates)

    const sceneFileCID = information.contents[SCENE_FILE]

    if (sceneFileCID) {
      const response = await this.client.getContent(sceneFileCID)
      if (response.statusCode === 200) {
        return JSON.parse(response.body)
      } else {
        fail(ErrorType.CONTENT_SERVER_ERROR, `Error retrieving parcel ${coordinates.x},${coordinates.y} scene.json: ${response.body}`)
      }
    }
    return null
  }

  private buildMetadata(rootCID: string, signature: string, address: string): RequestMetadata {
    const validity = new Date()
    validity.setMonth(validity.getMonth() + 6)
    return { value: rootCID, signature: signature, pubKey: address, validityType: 0, validity: validity, sequence: 2 }
  }

  private async filterUploadedContent(files: IFile[], manifest: ContentIdentifier[]): Promise<IFile[]> {
    const cidMaps = manifest.reduce((map, obj) => (map[obj.name] = obj.cid, map), {})
    const res = await this.client.checkContentStatus(Object.values(cidMaps))
    return files.filter(f => {
      const cid = cidMaps[f.path]
      const uploaded = res[cid]
      return uploaded !== undefined && !uploaded
    })
  }
}
