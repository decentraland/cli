import chalk from 'chalk'
import { Scene } from '@dcl/schemas'

import * as spinner from '../utils/spinner'

function checkMissingOrDefault<T extends Record<string, unknown>>(
  obj: T,
  defaults: T
) {
  const missingKeys = Object.entries(defaults).reduce(
    (acc: string[], [key, value]) => {
      return obj[key] && obj[key] !== value ? acc : acc.concat(key)
    },
    []
  )
  return missingKeys
}

export function validateScene(sceneJson: Scene, log: boolean = false): boolean {
  log && spinner.create('Validating scene.json')

  const validScene = Scene.validate(sceneJson)
  if (!validScene) {
    const error = (Scene.validate.errors || [])
      .map((a) => `${a.dataPath} ${a.message}`)
      .join('')

    log && spinner.fail(`Invalid scene.json: ${error}`)
    return false
  }

  const defaults: Scene['display'] = {
    title: 'DCL Scene',
    description: 'My new Decentraland project',
    navmapThumbnail: 'images/scene-thumbnail.png'
  }
  const sceneDisplay = sceneJson.display || {}

  const missingKeys = checkMissingOrDefault<NonNullable<Scene['display']>>(
    sceneDisplay,
    defaults
  )

  if (log) {
    if (missingKeys.length) {
      spinner.warn(`Don't forget to update your scene.json metadata: [${missingKeys.join(
        ', '
      )}]
        ${chalk.underline.bold(
          'https://docs.decentraland.org/development-guide/scene-metadata/'
        )}`)
    } else {
      spinner.succeed()
    }
  }

  return !missingKeys.length
}
