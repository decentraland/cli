import { EventEmitter } from "events"
import { ContentClient, ParcelInformation } from "./ContentClient"
import { IFile } from "../Project"
import { SignedMessage } from "decentraland-eth"
import Web3 = require('web3')
import { CIDUtils } from "./CIDUtils"
import { ContentUploadRequest, RequestMetadata, ContentIdentifier } from "./ContentUploadRequest"
import { fail } from "assert"

const web3utils = new Web3()
const SCENE_FILE = "scene.json"

/**
 * This mostly to decouple the event handling from the client.
 * But also, to add logic if needed.
 */
export class ContentService extends EventEmitter {
  client: ContentClient

  constructor(_client: ContentClient) {
    super()
    this.client = _client
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

  async getParcelStatus(x: number, y: number): Promise<ParcelInformation> {
    const response = await this.client.getParcelsInformation({ x: x, y: y }, { x: x, y: y })
    if (response.ok) {
      return (response.data.length > 0) ? response.data[0] : null
    }
    fail(`Error retrieving parcel ${x},${y} information: ${response.errorMessage}`)
  }

  async getSceneData(x: number, y: number): Promise<DCL.SceneMetadata> {
    const information: ParcelInformation = await this.getParcelStatus(x, y)

    const sceneFileCID = information.contents[SCENE_FILE]

    if (sceneFileCID) {
      const response = await this.client.getContent(sceneFileCID)
      if (response.statusCode === 200) {
        return JSON.parse(response.body)
      } else {
        fail(`Error retrieving parcel ${x},${y} scene.json: ${response.body}`)
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
