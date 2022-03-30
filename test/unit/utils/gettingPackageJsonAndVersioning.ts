import test from 'ava'
import { getCLIPackageJson } from '../../../src/utils/moduleHelpers'
import {
  getNpmMajorVersion,
  getNodeMajorVersion
} from '../../../src/utils/nodeAndNpmVersion'

test('Unit - getCLIPackageJson() - should have userEngines', async (t) => {
  const requiredVersion = await getCLIPackageJson<{
    userEngines: {
      minMajorNode: number
      minMajorNpm: number
    }
  }>()

  t.deepEqual(requiredVersion.userEngines, {
    minMajorNode: 14,
    minMajorNpm: 6
  })
})

test('Unit - npm and node versions - having installed node and npm should return valid values', async (t) => {
  const nodeVersion = await getNodeMajorVersion()
  const npmVersion = await getNpmMajorVersion()

  t.true(typeof nodeVersion === 'number')
  t.true(typeof npmVersion === 'number')
  t.true(npmVersion >= 7)
  t.true(nodeVersion >= 16)
})
