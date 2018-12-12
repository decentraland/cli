import { fail } from 'assert'

import { ContentUploadRequest } from './ContentUploadRequest'
import { Coords } from '../../utils/coordinateHelpers'

import * as request from 'request'
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

export class ContentClient {
  contentServerUrl: string

  constructor(contentServerUrl: string) {
    this.contentServerUrl = contentServerUrl
  }

  /**
   * Send the content in the request to the conetnt server
   * @param uploadRequest
   */
  async uploadContent(uploadRequest: ContentUploadRequest): Promise<any> {
    // TODO: use node-fetch here
    return new Promise<any>((resolve, reject) => {
      request.post({ url: `${this.contentServerUrl}/mappings`, formData: uploadRequest.requestContent() }, function optionalCallback(
        err,
        httpResponse,
        body
      ) {
        if (err) {
          fail(err)
        }
        const result = httpResponse.toJSON()
        resolve(result)
      })
    })
  }

  /**
   * Returns all the scenes related to all the parcels in the square specified by the x1,y1,x2,y2 coordinates.
   * It should include estates that are partially within the constraints of the provided range
   * @param from
   * @param to
   */
  async getParcelsInformation(from: Coords, to: Coords): Promise<MappingsResponse> {
    return new Promise<MappingsResponse>((resolve, reject) => {
      const params = { nw: `${from.x},${from.y}`, se: `${to.x},${to.y}` }
      // TODO: use node-fetch here
      request({ url: `${this.contentServerUrl}/mappings`, qs: params }, function(err, response) {
        if (err) {
          fail(err)
        }
        const result = response.toJSON()
        if (result.statusCode === 200) {
          const body = JSON.parse(result.body)
          resolve({ ok: true, data: body == null ? [] : body })
        } else {
          resolve({ ok: false, data: [], errorMessage: result.body })
        }
      })
    })
  }

  /**
   * Fetch a file from the content-service
   * @param cid CID use to identify the file
   */
  async getContent(cid: string): Promise<any> {
    // TODO: use node-fetch here
    return new Promise<MappingsResponse>((resolve, reject) => {
      request({ url: `${this.contentServerUrl}/contents/${cid}` }, function(err, response) {
        if (err) {
          fail(err)
        }
        resolve((response.toJSON() as any) as MappingsResponse)
      })
    })
  }

  async checkContentStatus(cids: string[]): Promise<Response> {
    return fetch(`${this.contentServerUrl}/content/status`,{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "content": cids })
    }).then(async function(response) {
      if (response.status >= 400) {
        const msg = await response.json()
        throw new Error(`Bad response from server: ${msg.error}`)
      }
      return response.json()
    })
  }

}
