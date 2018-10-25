import { ContentUploadRequest } from "./ContentUploadRequest"
import { fail } from "assert"

const request = require('request')

export class ContentClient {
  contentServerUrl: string

  constructor(_contentServerUrl: string) {
    this.contentServerUrl = (_contentServerUrl.endsWith("/")) ? _contentServerUrl : _contentServerUrl + "/"
  }

  /**
   * Send the content in the request to the conetnt server
   * @param uploadRequest
   */
  async uploadContent(uploadRequest: ContentUploadRequest): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      request.post({ url: this.contentServerUrl + 'mappings', formData: uploadRequest.requestContent() }, function optionalCallback(err, httpResponse, body) {
        if (err) {
          fail(err)
        }
        const result = httpResponse.toJSON()
        resolve(result)
      }
    )
    })
  }

}
