import { EventEmitter } from 'events'

import { ContentClient, ParcelInformation } from './ContentClient'
import { IFile } from '../Project'
import { RequestMetadata, ContentIdentifier } from './ContentUploadRequest'
import { Coords } from '../../utils/coordinateHelpers'
import { fail, ErrorType } from '../../utils/errors'
import { SceneMetadata } from '../../sceneJson/types'

const SCENE_FILE = 'scene.json'

export class ContentService extends EventEmitter {
  client: ContentClient

  constructor(client: ContentClient) {
    super()
    this.client = client
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
      `Error retrieving parcel ${coordinates.x},${coordinates.y} information: ${response.errorMessage}`
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
