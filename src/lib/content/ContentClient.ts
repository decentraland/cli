import * as fetch from 'isomorphic-fetch'

import { Coords } from '../../utils/coordinateHelpers'
import { fail, ErrorType } from '../../utils/errors'
import * as log from '../../utils/logging'
import { ContentUploadRequest } from './ContentUploadRequest'

export type ParcelInformation = {
  parcel_id: string
  contents: ContentElement[]
  root_cid: string
  publisher: string
}

export type ContentElement = {
  file: string
  hash: string
}

export type MappingsResponse = {
  ok: boolean
  data: ParcelInformation[]
  errorMessage?: string
}

export type UploadResponse = {
  success: boolean
  errorMessage: string
}

export class ContentClient {
  contentServerUrl: string

  constructor(contentServerUrl: string) {
    this.contentServerUrl = contentServerUrl
  }

  /**
   * Send the content in the request to the conetnt server
   * @param uploadRequest
   */
  async uploadContent(uploadRequest: ContentUploadRequest): Promise<UploadResponse> {
    try {
      const data = uploadRequest.requestContent()
      const response = await fetch(`${this.contentServerUrl}/mappings`, {
        method: 'post',
        headers: Object.assign(data.getHeaders()),
        body: data
      })

      if (response.status !== 200) {
        log.debug(response.body)
        const msg = await response.json()
        return { success: false, errorMessage: msg.error }
      }
      return { success: true, errorMessage: '' }
    } catch (error) {
      fail(ErrorType.CONTENT_SERVER_ERROR, error.message)
    }
  }

  /**
   * Returns all the scenes related to all the parcels in the square specified by the x1,y1,x2,y2 coordinates.
   * It should include estates that are partially within the constraints of the provided range
   * @param from
   * @param to
   */
  async getParcelsInformation(from: Coords, to: Coords): Promise<MappingsResponse> {
    try {
      const response = await fetch(
        `${this.contentServerUrl}/mappings?nw=${from.x},${from.y}&se=${to.x},${to.y}`
      )
      if (response.status >= 400) {
        const msg = await response.json()
        throw new Error(`Bad response from server: ${msg.error}`)
      }
      const content = await response.json()
      return { ok: true, data: content == null ? [] : content }
    } catch (error) {
      fail(ErrorType.CONTENT_SERVER_ERROR, error.message)
    }
  }

  /**
   * Fetch a file from the content-service
   * @param cid CID use to identify the file
   */
  async getContent(cid: string): Promise<any> {
    try {
      const url = `${this.contentServerUrl}/contents/${cid}`
      log.debug(url)
      const response = await fetch(url)
      if (response.status >= 400) {
        const msg = await response.json()
        throw new Error(`Bad response from server: ${msg.error}`)
      }
      return await response.json()
    } catch (error) {
      fail(ErrorType.CONTENT_SERVER_ERROR, error.message)
    }
  }

  async checkContentStatus(cids: string[]): Promise<Response> {
    try {
      const response = await fetch(`${this.contentServerUrl}/content/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: cids })
      })
      if (response.status >= 400) {
        const msg = await response.json()
        throw new Error(`Bad response from server: ${msg.error}`)
      }
      return await response.json()
    } catch (error) {
      fail(ErrorType.CONTENT_SERVER_ERROR, error.message)
    }
  }
}
