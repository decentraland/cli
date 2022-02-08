import { Scene, sdk } from '@dcl/schemas'
import chalk from 'chalk'

import { fail, ErrorType } from '../utils/errors'
import {
  getObject,
  isValid,
  getString,
  Coords
} from '../utils/coordinateHelpers'
import { getSceneFile, setSceneFile } from '../sceneJson'
import * as spinner from '../utils/spinner'
import { createWorkspace } from '../lib/Workspace'

export function help() {
  return `
  Usage: ${chalk.bold('dcl coords [parcels]')}

    ${chalk.dim('Options:')}

      -h, --help               Displays complete help

    ${chalk.dim('Examples:')}
      - ${chalk.bold('Single parcel')}
      - Pass a single argument with the scene coords. This coordinate is also set as the base parcel.
      ${chalk.green('$ dcl coords 0,0')}

      - ${chalk.bold('Multiple parcels')}
      - Pass two arguments: the South-West and the North-East parcels. The South-West parcel is also set as the base parcel.
      ${chalk.green('$ dcl coords 0,0 1,1')}

      - ${chalk.bold('Customize Base Parcel')}
      - Pass three arguments: the South-West and the North-East parcels, and the parcel to use as a base parcel.
      ${chalk.green('$ dcl coords 0,0 1,1 1,0')}
`
}

export async function main() {
  spinner.create('Generating coords')

  const parcels = process.argv.slice(
    process.argv.findIndex((arg) => arg === 'coords') + 1
  )
  const workingDir = process.cwd()

  const workspace = createWorkspace({ workingDir })
  const project = workspace.getSingleProject()
  if (project === null) {
    fail(ErrorType.INFO_ERROR, `Can not change a coords of workspace.`)
  } else if (project.getInfo().sceneType !== sdk.ProjectType.SCENE) {
    fail(
      ErrorType.INFO_ERROR,
      'Only parcel scenes can be edited the coords property.'
    )
  }

  if (!parcels || !parcels.length) {
    fail(ErrorType.INFO_ERROR, 'Please provide a target to retrieve data')
  }

  if (parcels.length > 3) {
    fail(ErrorType.INFO_ERROR, 'Invalid number of args')
  }

  const invalidParcel = parcels.find((p) => !isValid(p))
  if (invalidParcel) {
    fail(ErrorType.INFO_ERROR, `Invalid target "${chalk.bold(invalidParcel)}"`)
  }

  const parcelObjects = parcels.map(getObject)
  const { scene, ...sceneJson } = await getSceneFile(workingDir)
  const newScene = getSceneObject(parcelObjects)
  const parsedSceneJson: Scene = {
    ...sceneJson,
    scene: newScene
  }

  await setSceneFile(parsedSceneJson, workingDir)
  spinner.succeed()
}

function getSceneObject([sw, ne, baseParcel = sw]: Coords[]): Scene['scene'] {
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
    const coord = yValues.map((y) => getString({ x, y }))
    return acc.concat(coord)
  }, [])
  const base = parcels.length ? getString(baseParcel) : ''
  if (!parcels.includes(base)) {
    spinner.fail()
    fail(ErrorType.INFO_ERROR, `Invalid base parcel ${chalk.bold(base)}`)
  }

  return { parcels, base }
}
