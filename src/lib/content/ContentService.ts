import { EventEmitter } from 'events'
import { Entity, Scene } from '@dcl/schemas'
import {
  createCatalystClient,
  CatalystClient,
  ContentClient
} from 'dcl-catalyst-client'
import { createFetchComponent } from '@well-known-components/fetch-component'

import { Coords } from '../../utils/coordinateHelpers'
import { fail, ErrorType } from '../../utils/errors'
import { FileInfo } from '../Decentraland'

export class ContentService extends EventEmitter {
  private readonly client: CatalystClient
  private contentClient?: ContentClient

  constructor(catalystServerUrl: string) {
    super()
    this.client = createCatalystClient({
      url: catalystServerUrl,
      fetcher: createFetchComponent()
    })
  }

  /**
   * Retrives the uploaded content information by a given Parcel (x y coordinates)
   * @param x
   * @param y
   */
  async getParcelStatus(
    coordinates: Coords
  ): Promise<{ cid: string; files: FileInfo[] }> {
    const entity = await this.fetchEntity(coordinates)
    const content = entity.content
      ? entity.content.map((entry) => ({ name: entry.file, cid: entry.hash }))
      : []
    return { cid: entity.id, files: content }
  }

  /**
   * Retrives the content of the scene.json file from the content-server
   * @param x
   * @param y
   */
  async getSceneData(coordinates: Coords): Promise<Scene> {
    try {
      const entity = await this.fetchEntity(coordinates)
      return entity.metadata
    } catch (e) {
      throw e
    }
  }

  private async fetchEntity(coordinates: Coords): Promise<Entity> {
    const pointer = `${coordinates.x},${coordinates.y}`
    try {
      if (!this.contentClient) {
        this.contentClient = await this.client.getContentClient()
      }
      const entities = await this.contentClient.fetchEntitiesByPointers([
        pointer
      ])
      const entity: Entity | undefined = entities[0]
      if (!entity) {
        fail(
          ErrorType.CONTENT_SERVER_ERROR,
          `Error retrieving parcel ${coordinates.x},${coordinates.y} information`
        )
      }
      return entity
    } catch (error: any) {
      fail(ErrorType.CONTENT_SERVER_ERROR, error.message)
      throw error
    }
  }
}
