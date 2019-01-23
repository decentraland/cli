import test from 'ava'
import * as sinon from 'sinon'

import { ContentIdentifier } from '../../../../src/lib/content/ContentUploadRequest'
import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { ContentService } from '../../../../src/lib/content/ContentService'
import { Project } from '../../../../src/lib/Project'

async function createContext() {
  delete require.cache[require.resolve('../../../../src/lib/content/ContentClient')]
  const { ContentClient } = require('../../../../src/lib/content/ContentClient')
  const ctx = sinon.createSandbox()
  const project = new Project('test/unit/resources/data')
  const files = await project.getFiles()
  const rootCID = await CIDUtils.getFilesComposedCID(files)
  const manifest = await CIDUtils.getIdentifiersForIndividualFile(files)

  return {
    ctx,
    ContentClient,
    project,
    files,
    rootCID,
    manifest
  }
}

function buildStatusResponse(manifest: ContentIdentifier[], uploaded: boolean): any {
  const statusResponse = {}
  manifest.forEach(content => {
    statusResponse[content.cid] = uploaded
  })
  return statusResponse
}

const fakeContentUrl = 'http://localhost:8000'

test('Unit - ContentService.uploadContent() - should upload all new content', async t => {
  const { ctx, ContentClient, files, rootCID, manifest } = await createContext()
  ctx
    .stub(ContentClient.prototype, 'checkContentStatus')
    .callsFake(() => buildStatusResponse(manifest, false))
  const uploadContent = ctx
    .stub(ContentClient.prototype, 'uploadContent')
    .callsFake(async () => ({ success: true, errorMessage: '' }))

  const service: ContentService = await new ContentService(new ContentClient(fakeContentUrl))
  const result = await service.uploadContent(rootCID, files, '', '', false)

  t.true(result)
  t.deepEqual(uploadContent.args[0][0].files, files)
})

test('Unit - ContentService.uploadContent() - should Not upload previously uploded content (except scene.json file)', async t => {
  const { ctx, ContentClient, files, rootCID, manifest } = await createContext()
  ctx
    .stub(ContentClient.prototype, 'checkContentStatus')
    .callsFake(() => buildStatusResponse(manifest, true))
  const uploadContent = ctx
    .stub(ContentClient.prototype, 'uploadContent')
    .callsFake(async () => ({ success: true, errorMessage: '' }))

  const service: ContentService = new ContentService(new ContentClient(fakeContentUrl))
  const result = await service.uploadContent(rootCID, files, '', '', false)

  t.true(result)
  const sentFiles = uploadContent.args[0][0].files
  t.is(sentFiles.length, 1)
  t.is(sentFiles[0].path, 'scene.json')
})

test('Unit - ContentService.uploadContent() - should upload all content in fullUpload mode', async t => {
  const { ctx, ContentClient, files, rootCID, manifest } = await createContext()
  ctx
    .stub(ContentClient.prototype, 'checkContentStatus')
    .callsFake(() => buildStatusResponse(manifest, true))
  const uploadContent = ctx
    .stub(ContentClient.prototype, 'uploadContent')
    .callsFake(async () => ({ success: true, errorMessage: '' }))

  const service: ContentService = new ContentService(new ContentClient(fakeContentUrl))
  const result = await service.uploadContent(rootCID, files, '', '', true)

  t.true(result)
  t.deepEqual(uploadContent.args[0][0].files, files)
})

test('Unit - ContentService.uploadContent() - should fail if upload calls fails', async t => {
  const { ctx, ContentClient, files, rootCID } = await createContext()
  ctx
    .stub(ContentClient.prototype, 'uploadContent')
    .callsFake(async () => ({ success: false, errorMessage: 'Something failed' }))

  const service: ContentService = new ContentService(new ContentClient(fakeContentUrl))
  const result = await service.uploadContent(rootCID, files, '', '', true)

  t.false(result)
})
