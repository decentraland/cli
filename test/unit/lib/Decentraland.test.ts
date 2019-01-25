import test from 'ava'
import * as sinon from 'sinon'

import { ContentService } from '../../../src/lib/content/ContentService'
import { Decentraland } from '../../../src/lib/Decentraland'
import { Project } from '../../../src/lib/Project'
import * as ProjectUtils from '../../../src/utils/project'

const address = '0x8Bed95D830475691C10281f1FeA2c0a0fE51304B'
const projectSignature =
  '0x9adcd58e1d65aeb9d92cb25f59a1f9d1c19d9935534c91e59057135b2ecf020e3e56476788cee00bd4a8aa62602af307851276ee4b97be4832fbc541b24f0d141c'

function createSandbox() {
  const ctx = sinon.createSandbox()

  // Project stubs
  ctx.stub(Project.prototype, 'validateExistingProject').callsFake(() => undefined)
  const validateSceneOptionsStub = ctx
    .stub(Project.prototype, 'validateSceneOptions')
    .callsFake(() => undefined)
  ctx.stub(Project.prototype, 'getParcelCoordinates').callsFake(async () => ({ x: 0, y: 0 }))
  const getFilesStub = ctx
    .stub(Project.prototype, 'getFiles')
    .callsFake(async () => [{ path: '/tmp/myFile.txt', content: null, size: null }])

  // Decentraland stubs
  const linkStub = ctx.stub(Decentraland.prototype, 'link').callsFake(async () => ({
    signature: projectSignature,
    address,
    network: { id: 0, name: 'mainnet' }
  }))

  // ContentServicestubs
  const uploadContentStub = ctx
    .stub(ContentService.prototype, 'uploadContent')
    .callsFake(async () => true)

  return {
    ctx,
    validateSceneOptionsStub,
    getFilesStub,
    linkStub,
    uploadContentStub
  }
}

test('Unit - Decentraland.deploy() - should call all the necessary APIs', async t => {
  const { validateSceneOptionsStub, getFilesStub, linkStub, uploadContentStub } = createSandbox()
  const dcl = new Decentraland({ yes: true })
  const files = await dcl.project.getFiles()
  await dcl.deploy(files)

  t.true(getFilesStub.called)
  t.true(validateSceneOptionsStub.called)
  t.true(linkStub.calledBefore(uploadContentStub))
  t.true(uploadContentStub.called)
})
