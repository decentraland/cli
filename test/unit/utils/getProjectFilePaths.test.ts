import test from 'ava'
import * as path from 'path'
import * as fs from 'fs-extra'

import getProjectFilePaths from '../../../src/utils/getProjectFilePaths'

test('Unit - getProjectFilePaths() - should return all filtered project files', async t => {
  const dir = path.join(__dirname, '../../fixtures/ecs-compiled')
  const dclIgnoreContent = await fs.readFile(
    path.join(__dirname, '../../fixtures/ecs-compiled/.dclignore'),
    'utf-8'
  )

  const filePaths = await getProjectFilePaths(dir, dclIgnoreContent)
  t.deepEqual(filePaths, ['scene.json', 'bin/game.js', 'src/utils/index.js'])
})
