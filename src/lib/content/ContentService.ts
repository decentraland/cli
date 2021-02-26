import { EventEmitter } from 'events'

import { Coords } from '../../utils/coordinateHelpers'
import { fail, ErrorType } from '../../utils/errors'
import { SceneMetadata } from '../../sceneJson/types'
import { FileInfo } from '../Decentraland'
import { CatalystClient } from 'dcl-catalyst-client'
import { EntityType, Entity } from 'dcl-catalyst-commons'

export class ContentService extends EventEmitter {
  private readonly client: CatalystClient

  constructor(catalystServerUrl: string) {
    super()
    this.client = new CatalystClient(catalystServerUrl, 'CLI')
  }

  /**
   * Retrives the uploaded content information by a given Parcel (x y coordinates)
   * @param x
   * @param y
   */
  async getParcelStatus(coordinates: Coords): Promise<{ cid: string; files: FileInfo[] }> {
    const entity = await this.fetchEntity(coordinates)
    const content = entity.content
      ? entity.content.map(entry => ({ name: entry.file, cid: entry.hash }))
      : []
    return { cid: entity.id, files: content }
  }

  /**
   * Retrives the content of the scene.json file from the content-server
   * @param x
   * @param y
   */
  async getSceneData(coordinates: Coords): Promise<SceneMetadata> {
    try {
      const entity = await this.fetchEntity(coordinates)
      return entity.metadata
    } catch {
      return null
    }
  }

  private async fetchEntity(coordinates: Coords): Promise<Entity> {
    const pointer = `${coordinates.x},${coordinates.y}`
    try {
      const entities = await this.client.fetchEntitiesByPointers(EntityType.SCENE, [pointer])
      const entity: Entity | undefined = entities[0]
      if (!entity) {
        fail(
          ErrorType.CONTENT_SERVER_ERROR,
          `Error retrieving parcel ${coordinates.x},${coordinates.y} information`
        )
      }
      return entity
    } catch (error) {
      fail(ErrorType.CONTENT_SERVER_ERROR, error.message)
    }
  }
}
