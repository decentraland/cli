import test, { ExecutionContext } from 'ava'
import { sdk } from '@dcl/schemas'

import { help } from '../../src/commands/init'
import pathsExistOnDir from '../../src/utils/pathsExistOnDir'
import { createSandbox } from '../helpers/sandbox'
import { runCommand, Response, endCommand } from '../helpers/commando'

const initCommand = (dirPath: string, args?: string) => runCommand(dirPath, 'init', args)

async function projectCreatedSuccessfully(t: ExecutionContext, dirPath: string, type: sdk.ProjectType) {
  const files = DEFAULT_FILES[type]
  const pathsExists = await pathsExistOnDir(dirPath, files)
  pathsExists.slice(0, files.length).forEach((file) => t.true(file))
}

const DEFAULT_FILES: Record<sdk.ProjectType, string[]> = {
  [sdk.ProjectType.SCENE]: [
    'src/game.ts',
    'scene.json',
    'package.json',
    'node_modules',
    '.dclignore',
    'node_modules/decentraland-ecs'
  ],
  [sdk.ProjectType.PORTABLE_EXPERIENCE]: ['wearable.json', 'AvatarWearables_TX.png', 'src/game.ts'],
  [sdk.ProjectType.SMART_ITEM]: ['scene.json', 'package.json', 'asset.json'],
  [sdk.ProjectType.LIBRARY]: []
}

test('snapshot - dcl help init', (t) => {
  t.snapshot(help())
})

test('dcl init with prompt', async (t) => {
  await createSandbox(async (dirPath: string) => {
    const cmd = initCommand(dirPath)
    cmd.orderedWhen(/Choose a project type/, () => {
      console.log('Choose a project type')
      return [Response.ENTER]
    })
    cmd.orderedWhen(/Choose a scene/, () => {
      console.log('Choose a scene')
      return [Response.ENTER]
    })

    await endCommand(cmd)
    await projectCreatedSuccessfully(t, dirPath, sdk.ProjectType.SCENE)
  })
})

test('dcl init with -p option', async (t) => {
  await createSandbox(async (dirPath: string) => {
    const cmd = initCommand(dirPath, '-p scene')
    await endCommand(cmd)
    await projectCreatedSuccessfully(t, dirPath, sdk.ProjectType.SCENE)
  })
})

test('dcl init with invalid -p option', async (t) => {
  await createSandbox(async (dirPath: string) => {
    const cmd = initCommand(dirPath, '-p invalidoption')
    await endCommand(cmd)
    const [sceneJson] = await pathsExistOnDir(dirPath, ['scene.json'])
    t.false(sceneJson)
  })
})
