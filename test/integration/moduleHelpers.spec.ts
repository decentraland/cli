import * as path from 'path'
import { expect } from 'chai'
import { sandbox } from 'sinon'
import { tmpTest } from './sandbox'
import * as Helpers from '../../src/utils/moduleHelpers'
import { setupFilesystem } from '../helpers'
import * as proxyquire from 'proxyquire'

const ctx = sandbox.create()
let latestVersionStub
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
      latestVersionStub = ctx.stub().callsFake(() => '1.0.0')
      helpers = proxyquire('../../src/utils/moduleHelpers', {
        'package-json': latestVersionStub
      })
    })

    describe('isMetaverseApiOutdated()', async () => {
      it('should return false is the local and remote versions are equal', async () => {
        const isOutdated = await helpers.isMetaverseApiOutdated()
        expect(isOutdated).to.be.false
      }).timeout(5000)

      it('should return false is the local version is lower than the remote version', async () => {
        latestVersionStub.callsFake(() => '1.5.0')
        const isOutdated = await helpers.isMetaverseApiOutdated()
        expect(isOutdated).to.be.false
      }).timeout(5000)
    })
  })
})
