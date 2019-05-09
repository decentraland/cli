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
}

export type ContentIdentifier = {
  cid: string
  name: string
}

export class ContentUploadRequest {
  rootCid: string
  files: IFile[]
  manifest: ContentIdentifier[]
  metadata: RequestMetadata
  timestamp: number

  constructor(
    _rootCid: string,
    _files: IFile[],
    _manifest: ContentIdentifier[],
    _metadata: RequestMetadata
  ) {
    this.rootCid = _rootCid
    this.files = _files
    this.manifest = _manifest
    this.metadata = _metadata
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
