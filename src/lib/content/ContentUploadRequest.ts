import { IFile } from "../Project"

export type RequestMetadata = {
  value: string
  signature: string
  pubKey: string
  validityType: number
  validity: Date
  sequence: number
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

  constructor(_rootCid: string, _files: IFile[], _manifest: ContentIdentifier[], _metadata: RequestMetadata) {
    this.rootCid = _rootCid
    this.files = _files
    this.manifest = _manifest
    this.metadata = _metadata
  }

  requestContent(): any {
    const formData: any = {
      metadata: JSON.stringify(this.metadata),
      [this.rootCid] : JSON.stringify(this.manifest)
    }
    this.files.forEach((file) => {
      const identifier = this.manifest.find(ci => {
        return ci.name === file.path
      })
      if (identifier) this.addFileToRequest(identifier, file, formData)
    })
    return formData
  }

  private addFileToRequest(identifier: ContentIdentifier, file: IFile, form: any): void {
    form[identifier.cid] = {
      value: file.content,
      options: {
        filename: file.path
      }
    }
  }
}
