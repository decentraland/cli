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
}
