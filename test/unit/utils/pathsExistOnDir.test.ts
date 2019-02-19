import test from 'ava'
import * as path from 'path'

import pathsExistOnDir from '../../../src/utils/pathsExistOnDir'

test('Unit - pathsExistOnDir() - should return all boolean existances of files on dir', async t => {
  const dir = path.join(__dirname, '../../fixtures/ecs-compiled')

  const filesExist = await pathsExistOnDir(dir, ['scene.json', 'bin/game.js'])
  t.deepEqual(filesExist, [true, true])
})
