import { expect } from 'chai'
import { sandbox } from 'sinon'
import * as proxyquire from 'proxyquire'

import { setupFilesystem } from '../helpers'
import { tmpTest, TIMEOUT_MS } from '../../sandbox'
import * as filesystem from '../../../src/utils/filesystem'

const ctx = sandbox.create()
let packageJsonStub
let readJSONStub
let getInstalledCLIVersionStub
let helpers: typeof import('../../../src/utils/moduleHelpers')

tmpTest(async (dirPath, done) => {
  await setupFilesystem(dirPath, [
    {
      path: 'node_modules/decentraland-api/package.json',
      content: '{ version: "1.0.0" }'
    }
  ])

  describe('moduleHelpers', () => {
    after(() => done())
    afterEach(() => {
      ctx.restore()
    })

    beforeEach(() => {
      packageJsonStub = ctx.stub().callsFake(() => ({ version: '1.0.0' }))
      readJSONStub = ctx
        .stub(filesystem, 'readJSON')
        .callsFake(async () => ({ version: '0.1.0' }))
      getInstalledCLIVersionStub = { version: '0.1.0' }

      /**
       * Due to the way that node modules work we can't create a stub for a function (that belongs to a module)
       * and then call another function (within the same module) that calls our stubbed function.
       * We can't create a standard stub for this module neither because it exports a function directly (module.exports = fn)
       * proxyrequire is a helper that proxies nodejs's require allowing us to override dependencies using stubs.
       */
      helpers = proxyquire('../../../src/utils/moduleHelpers', {
        'package-json': packageJsonStub,
        'package.json': getInstalledCLIVersionStub
      })
    })

    describe('isDecentralandApiOutdated()', async () => {
      it('should return false if the local and remote versions are equal', async () => {
        readJSONStub.callsFake(() => ({ version: '1.0.0' }))
        const isOutdated = await helpers.getOutdatedApi()
        expect(isOutdated).to.be.undefined
      }).timeout(TIMEOUT_MS)

      it('should return false if the local version is higher than the remote version', async () => {
        packageJsonStub.callsFake(() => ({ version: '0.1.0' }))
        readJSONStub.callsFake(() => ({ version: '1.0.0' }))
        const isOutdated = await helpers.getOutdatedApi()
        expect(isOutdated).to.be.undefined
      }).timeout(TIMEOUT_MS)

      it('should return true if the local version is lower than the remote version', async () => {
        const isOutdated = await helpers.getOutdatedApi()
        expect(isOutdated).to.be.not.undefined
      }).timeout(TIMEOUT_MS)
    })

    describe('isCLIOutdated()', async () => {
      it('should return false if the local and remote versions are equal', async () => {
        getInstalledCLIVersionStub = '1.0.0'
        const isOutdated = await helpers.isCLIOutdated()
        expect(isOutdated).to.be.false
      }).timeout(TIMEOUT_MS)

      it('should return false if the local version is higher than the remote version', async () => {
        getInstalledCLIVersionStub = '2.0.0'
        const isOutdated = await helpers.isCLIOutdated()
        expect(isOutdated).to.be.false
      }).timeout(TIMEOUT_MS)
    })
  })
})
