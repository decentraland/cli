import { EventEmitter } from "events"
import { ContentClient, ParcelInformation } from "./ContentClient"
import { IFile } from "../Project"
import { SignedMessage } from "decentraland-eth"
import Web3 = require('web3')
import { CIDUtils } from "./CIDUtils"
import { ContentUploadRequest, RequestMetadata, ContentIdentifier } from "./ContentUploadRequest"
import { Coords } from "src/utils/coordinateHelpers"
import { fail, ErrorType } from "src/utils/errors"

const web3utils = new Web3()
const SCENE_FILE = "scene.json"

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
  async uploadContent(rootCID: string, content: IFile[], contentSignature: string): Promise<boolean> {
    this.emit('upload:starting')
    const manifest: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile(content)
    const metadata: RequestMetadata = this.buildMetadata(rootCID, contentSignature)
    const response = await this.client.uploadContent(new ContentUploadRequest(rootCID, content, manifest, metadata))

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
      return (response.data.length > 0) ? response.data[0] : null
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

  private buildMetadata(rootCID: string, signature: string): RequestMetadata {
    const signedMessage = new SignedMessage(web3utils.toHex(rootCID), signature)
    const validity = new Date()
    validity.setMonth(validity.getMonth() + 6)
    return {value: rootCID,
      signature: signature,
      pubKey: signedMessage.getAddress(),
      validityType: 0,
      validity: validity,
      sequence: 2}
  }

}
