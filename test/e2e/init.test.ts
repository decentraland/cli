import * as fs from 'fs-extra'
import path from 'path'
import test, { ExecutionContext } from 'ava'
import { Scene } from '@dcl/schemas'

import { help } from '../../src/commands/init'
import pathsExistOnDir from '../../src/utils/pathsExistOnDir'
import { createSandbox } from '../helpers/sandbox'
import { runCommand, Response, endCommand } from '../helpers/commando'
import { BoilerplateType } from '../../src/lib/Project'

const initCommand = (dirPath: string, args?: string) =>
  runCommand(dirPath, 'init', args)

async function projectCreatedSuccessfully(
  t: ExecutionContext,
  dirPath: string,
  boilerplate: BoilerplateType,
  filesPath?: string[]
) {
  const files = filesPath || DEFAULT_FILES[boilerplate]
  const pathsExists = await pathsExistOnDir(dirPath, files)

  pathsExists.slice(0, files.length).forEach((file) => t.true(file))

  const [sceneFile, expected]: Scene[] = await Promise.all([
    fs.readJson(path.resolve(dirPath, 'scene.json')),
    fs.readJson(
      path.resolve(__dirname, `../../samples/${boilerplate}/scene.json`)
    )
  ])

  t.deepEqual(sceneFile, expected)
}

const DEFAULT_FILES: Record<BoilerplateType, string[]> = {
  [BoilerplateType.ECS]: [
    'src/game.ts',
    'scene.json',
    'package.json',
    'node_modules',
    '.dclignore',
    'node_modules/decentraland-ecs'
  ],
  [BoilerplateType.PORTABLE_EXPERIENCE]: [],
  [BoilerplateType.SMART_ITEM]: ['scene.json', 'package.json']
}

test('snapshot - dcl help init', (t) => {
  t.snapshot(help())
})

test('E2E - dcl init with prompt', async (t) => {
  await createSandbox(async (dirPath: string) => {
    const cmd = initCommand(dirPath)

    cmd.orderedWhen(/Choose a boilerplate/, () => [Response.ENTER])

    await endCommand(cmd)
    await projectCreatedSuccessfully(t, dirPath, BoilerplateType.ECS)
  })
})

test('E2E - dcl init with -b option', async (t) => {
  await createSandbox(async (dirPath: string) => {
    const cmd = initCommand(dirPath, '-b ecs')

    await endCommand(cmd)
    await projectCreatedSuccessfully(t, dirPath, BoilerplateType.ECS)
  })
})

test('E2E - dcl init with invalid -b option', async (t) => {
  await createSandbox(async (dirPath: string) => {
    const cmd = initCommand(dirPath, '-b dcl')
    await endCommand(cmd)
    const [sceneJson] = await pathsExistOnDir(dirPath, ['scene.json'])
    t.false(sceneJson)
  })
})

test('E2E - dcl init with smart-items prompt selection', async (t) => {
  await createSandbox(async (dirPath: string) => {
    const cmd = initCommand(dirPath)

    cmd.orderedWhen(/Choose a boilerplate/, () => [
      Response.DOWN,
      Response.ENTER
    ])

    await endCommand(cmd)
    await projectCreatedSuccessfully(t, dirPath, BoilerplateType.SMART_ITEM)
  })
})
