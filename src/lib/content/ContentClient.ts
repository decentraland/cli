import { ContentUploadRequest } from "./ContentUploadRequest"

export class ContentClient {
  contentServerUrl: string

  constructor(_contentServerUrl: string) {
    this.contentServerUrl = _contentServerUrl
  }

  uploadContent(request: ContentUploadRequest): void {
    // Do something here
  }

}
