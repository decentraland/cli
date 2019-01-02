import { fail } from 'assert'

import { ContentUploadRequest } from './ContentUploadRequest'
import { Coords } from '../../utils/coordinateHelpers'

import * as fetch from 'isomorphic-fetch'

export type ParcelInformation = {
  parcel_id: string
  contents: Map<string, string>
  root_cid: string
  publisher: string
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
  async uploadContent(
    uploadRequest: ContentUploadRequest
  ): Promise<UploadResponse> {
    try {
      const data = uploadRequest.requestContent()
      const response = await fetch(`${this.contentServerUrl}/mappings`, {
        method: 'post',
        headers: Object.assign(data.getHeaders()),
        body: data
      })

      if (response.status !== 200) {
        const msg = await response.json()
        return { success: false, errorMessage: msg.error }
      }
      return { success: true, errorMessage: '' }
    } catch (error) {
      fail(error)
    }
  }

  /**
   * Returns all the scenes related to all the parcels in the square specified by the x1,y1,x2,y2 coordinates.
   * It should include estates that are partially within the constraints of the provided range
   * @param from
   * @param to
   */
  async getParcelsInformation(
    from: Coords,
    to: Coords
  ): Promise<MappingsResponse> {
    try {
      const response = await fetch(
        `${this.contentServerUrl}/mappings?nw=${from.x},${from.y}&se=${to.x},${
          to.y
        }`
      )
      if (response.status >= 400) {
        const msg = await response.json()
        throw new Error(`Bad response from server: ${msg.error}`)
      }
      const content = await response.json()
      return { ok: true, data: content == null ? [] : content }
    } catch (error) {
      fail(error)
    }
  }

  /**
   * Fetch a file from the content-service
   * @param cid CID use to identify the file
   */
  async getContent(cid: string): Promise<any> {
    try {
      const response = await fetch(`${this.contentServerUrl}/contents/${cid}`)
      if (response.status >= 400) {
        const msg = await response.json()
        throw new Error(`Bad response from server: ${msg.error}`)
      }
      return await response.json()
    } catch (error) {
      fail(error)
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
      fail(error)
    }
  }
}
