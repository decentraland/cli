import chalk from 'chalk'

import * as spinner from '../utils/spinner'
import { SceneMetadata } from './types'

export function validateSceneMetadata(
  sceneJson: SceneMetadata,
  withSpinner: boolean = false,
): string[] {
  withSpinner && spinner.create('Validating scene metadata')
  const { title, description, navmapThumbnail } = sceneJson.display || {}
  const validTitle = title && title !== 'DCL Scene'
  const validDesc = description && description !== 'My new Decentraland project'
  const validThumbnail = navmapThumbnail && navmapThumbnail !== 'images/scene-thumbnail.png'

  const missingKeys = Object.entries({
    title: validTitle,
    description: validDesc,
    navmapThumbnail: validThumbnail
  }).reduce(
    (acc: string[], [key, value]) => {
      return value ? acc : acc.concat(key)
    },
    []
  )

  if (withSpinner) {
    if (missingKeys.length) {
      spinner.warn(`Don't forget to update your scene.json metadata: [${missingKeys.join(', ')}]
        ${chalk.underline.bold(
          'https://docs.decentraland.org/development-guide/scene-metadata/'
        )}`
      )
    } else {
      spinner.succeed()
    }
  }

  return missingKeys
}
