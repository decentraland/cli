import { ContentUploadRequest } from "./ContentUploadRequest"
import { fail } from "assert"
import { EventEmitter } from 'events'

const request = require('request')

export class ContentClient extends EventEmitter {
  contentServerUrl: string

  constructor(_contentServerUrl: string) {
    super()
    this.contentServerUrl = (_contentServerUrl.endsWith("/")) ? _contentServerUrl : _contentServerUrl + "/"
  }

  async uploadContent(uploadRequest: ContentUploadRequest): Promise<any> {
    this.emit('upload:starting')
    return new Promise<any>((resolve, reject) => {
      request.post({ url: this.contentServerUrl + 'mappings', formData: uploadRequest.requestContent() }, function optionalCallback(err, httpResponse, body) {
        if (err) {
          this.emit('upload:failed', new Error(`Failed to upload: ${err}`))
          fail(err)
        }
        const result = httpResponse.toJSON()
        if (result.status !== 200) {
          this.emit('upload:failed', JSON.stringify(result))
        } else {
          this.emit('upload:success')
        }
        resolve(result)
      }
    )
    })
  }

}
