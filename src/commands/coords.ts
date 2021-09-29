import chalk from 'chalk'

import { fail, ErrorType } from '../utils/errors'
import { getObject, isValid, getString, Coords } from '../utils/coordinateHelpers'
import { getSceneFile, setSceneFile } from '../sceneJson'
import { SceneMetadata } from '../sceneJson/types'
import * as spinner from '../utils/spinner'

export function help() {
  return `
  Usage: ${chalk.bold('dcl coords [sw] [ne] [base]')}

    ${chalk.dim('Options:')}

      -h, --help               Displays complete help

    ${chalk.dim('Examples:')}

      - Updates scene.json with { parcels: ["0,0"], base: "0,0" }
      ${chalk.green('$ dcl coords 0,0')}

      - Updates scene.json with { parcels: ["0,0", "0,1", "1,0", "1,1"], base: "0,0" }
      ${chalk.green('$ dcl coords 0,0 1,1')}

      - Updates scene.json with { parcels: ["0,0", "0,1", "1,0", "1,1"], base: "1,0" }
      ${chalk.green('$ dcl coords 0,0 1,1 1,0')}
`
}

export async function main() {
  spinner.create('Generating coords')

  const parcels = process.argv.slice(process.argv.findIndex(arg => arg === 'coords') + 1)
  const workDir = process.cwd()

  if (!parcels || !parcels.length) {
    fail(ErrorType.INFO_ERROR, 'Please provide a target to retrieve data')
  }

  if (parcels.length > 3) {
    fail(ErrorType.INFO_ERROR, 'Invalid number of args')
  }

  const invalidParcel = parcels.find(p => !isValid(p))
  if (invalidParcel) {
    fail(ErrorType.INFO_ERROR, `Invalid target "${chalk.bold(invalidParcel)}"`)
  }

  const parcelObjects = parcels.map(getObject)
  const { scene, ...sceneJson } = await getSceneFile(workDir)
  const newScene = getSceneObject(parcelObjects)
  const parsedSceneJson: SceneMetadata = {
    ...sceneJson,
    scene: newScene
  }

  await setSceneFile(parsedSceneJson, workDir)
  spinner.succeed()
}

function getSceneObject([sw, ne, baseParcel = sw]: Coords[]): SceneMetadata['scene'] {
  if (!ne) {
    const coords = getString(sw)
    return { base: coords, parcels: [coords] }
  }

  const getValues = (key: keyof Coords) =>
    Array.from({
      length: ne[key] - sw[key] + 1
    }).map((_, value) => value + sw[key])

  const xValues = getValues('x')
  const yValues = getValues('y')
  const parcels = xValues.reduce((acc: string[], x) => {
    const coord = yValues.map(y => getString({ x, y }))
    return acc.concat(coord)
  }, [])
  const base = parcels.length ? getString(baseParcel) : ''
  if (!parcels.includes(base)) {
    spinner.fail()
    fail(ErrorType.INFO_ERROR, `Invalid base parcel ${chalk.bold(base)}`)
  }

  return { parcels, base }
}
