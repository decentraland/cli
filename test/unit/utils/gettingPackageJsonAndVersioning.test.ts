import test from 'ava'
import { getCLIPackageJson } from '../../../src/utils/moduleHelpers'
import { getNodeVersion, getNpmVersion } from '../../../src/utils/nodeAndNpmVersion'

test('Unit - getCLIPackageJson() - should have userEngines', async (t) => {
  const requiredVersion = await getCLIPackageJson<{
    userEngines: {
      minNodeVersion: string
      minNpmVersion: string
    }
  }>()

  t.deepEqual(requiredVersion.userEngines, {
    minNodeVersion: '14.0.0',
    minNpmVersion: '6.0.0'
  })
})

test('Unit - npm and node versions - having installed node and npm should return valid values', async (t) => {
  const nodeVersion = await getNodeVersion()
  const npmVersion = await getNpmVersion()

  t.true(typeof nodeVersion === 'string')
  t.true(typeof npmVersion === 'string')

  const majorNodeVersion = parseInt(nodeVersion.split('.')[0])
  const majorNpmVersion = parseInt(npmVersion.split('.')[0])

  t.true(majorNpmVersion >= 7)
  t.true(majorNodeVersion >= 16)
})
