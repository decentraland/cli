import * as path from 'path'
import { expect } from 'chai'
import { sandbox } from 'sinon'
import { tmpTest } from './sandbox'
import * as Helpers from '../../src/utils/moduleHelpers'
import { setupFilesystem } from '../helpers'
import * as proxyquire from 'proxyquire'
import * as filesystem from '../../src/utils/filesystem'

const ctx = sandbox.create()
let packageJsonStub
let helpers

tmpTest(async (dirPath, done) => {
  await setupFilesystem(dirPath, [
    {
      path: 'node_modules/metaverse-api/package.json',
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
      helpers = proxyquire('../../src/utils/moduleHelpers', {
        'package-json': packageJsonStub
      })
    })

    describe('isMetaverseApiOutdated()', async () => {
      it('should return false if the local and remote versions are equal', async () => {
        const isOutdated = await helpers.isMetaverseApiOutdated()
        expect(isOutdated).to.be.false
      }).timeout(5000)

      it('should return false if the local version is lower than the remote version', async () => {
        packageJsonStub.callsFake(() => ({ version: '1.0.0' }))
        const isOutdated = await helpers.isMetaverseApiOutdated()
        expect(isOutdated).to.be.false
      }).timeout(5000)
    })

    describe('isCLIOutdated()', async () => {
      it('should return false if the local and remote versions are equal', async () => {
        const readJSONStub = ctx.stub(filesystem, 'readJSON').resolves({ version: '1.0.0' })
        const isOutdated = await helpers.isCLIOutdated()
        expect(isOutdated).to.be.false
      }).timeout(5000)

      it('should return false if the local version is lower than the remote version', async () => {
        const readJSONStub = ctx.stub(filesystem, 'readJSON').resolves({ version: '0.0.5' })
        const isOutdated = await helpers.isCLIOutdated()
        expect(isOutdated).to.be.true
      }).timeout(5000)
    })
  })
})
