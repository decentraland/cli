import { IFile } from '../Project'

const FormData = require('form-data')

export type RequestMetadata = {
  value: string
  signature: string
  pubKey: string
  validityType: number
  validity: Date
  sequence: number
  timestamp: number
  userId: string
}

export type ContentIdentifier = {
  cid: string
  name: string
}

export class ContentUploadRequest {
  timestamp: number

  constructor(
    private rootCid: string,
    private files: IFile[],
    private manifest: ContentIdentifier[],
    private metadata: RequestMetadata
  ) {
    this.rootCid = rootCid
    this.files = files
    this.manifest = manifest
    this.metadata = metadata
  }

  /**
   * Generates a formData to sent in a http multipart request
   */
  requestContent(): any {
    const data = new FormData()
    data.append('metadata', JSON.stringify(this.metadata))
    data.append(this.rootCid, JSON.stringify(this.manifest))
    this.files.forEach(file => {
      const identifier = this.manifest.find(ci => {
        return ci.name === file.path
      })
      if (identifier) {
        data.append(identifier.cid, file.content, {
          filepath: file.path
        })
      }
    })
    return data
  }
}
