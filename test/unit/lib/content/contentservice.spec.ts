import { sandbox } from 'sinon'
import { expect } from 'chai'

import { Project, IFile } from '../../../../src/lib/Project'
import { ContentIdentifier } from '../../../../src/lib/content/ContentUploadRequest'
import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { ContentClient } from '../../../../src/lib/content/ContentClient'
import { ContentService } from '../../../../src/lib/content/ContentService'

const ctx = sandbox.create()

const dataFolderPath = 'test/unit/resources/data'

const fakeContentUrl = 'http://localhost:8000'

describe('ContentService', () => {
  let project: Project
  let files: IFile[]
  let rootCID: string
  let manifest: ContentIdentifier[]

  let checkContentStatus
  let uploadContent

  before(async () => {
    project = new Project(dataFolderPath)
    files = await project.getFiles()
    rootCID = await CIDUtils.getFilesComposedCID(files)
    manifest = await CIDUtils.getIdentifiersForIndividualFile(files)
  })

  afterEach(function() {
    checkContentStatus.restore()
    uploadContent.restore()
  })

  it('should upload all new content', async () => {
    checkContentStatus = ctx.stub(ContentClient.prototype, 'checkContentStatus').callsFake(() => buildStatusResponse(manifest, false))
    uploadContent = ctx.stub(ContentClient.prototype, 'uploadContent').callsFake(() => ({ success: true, errorMessage: '' }))

    const service: ContentService = await new ContentService(new ContentClient(fakeContentUrl))
    const result = await service.uploadContent(rootCID, files, '', '', false)

    expect(result).to.be.true
    expect(uploadContent.args[0][0].files).to.have.all.members(files)
  })

  it('should Not upload previously uploded content (except scene.json file)', async () => {
    checkContentStatus = ctx.stub(ContentClient.prototype, 'checkContentStatus').callsFake(() => buildStatusResponse(manifest, true))
    uploadContent = ctx.stub(ContentClient.prototype, 'uploadContent').callsFake(() => ({ success: true, errorMessage: '' }))

    const service: ContentService = new ContentService(new ContentClient(fakeContentUrl))
    const result = await service.uploadContent(rootCID, files, '', '', false)

    expect(result).to.be.true
    const sentFiles = uploadContent.args[0][0].files
    expect(sentFiles.length).to.be.eq(1)
    expect(sentFiles[0].path).to.be.eq('scene.json')
  })

  it('should upload all content in fullUpload mode', async () => {
    checkContentStatus = ctx.stub(ContentClient.prototype, 'checkContentStatus').callsFake(() => buildStatusResponse(manifest, true))
    uploadContent = ctx.stub(ContentClient.prototype, 'uploadContent').callsFake(() => ({ success: true, errorMessage: '' }))

    const service: ContentService = new ContentService(new ContentClient(fakeContentUrl))
    const result = await service.uploadContent(rootCID, files, '', '', true)

    expect(result).to.be.true
    expect(uploadContent.args[0][0].files).to.have.all.members(files)
  })

  it('should fail if upload calls fails', async () => {
    uploadContent = ctx
      .stub(ContentClient.prototype, 'uploadContent')
      .callsFake(() => ({ success: false, errorMessage: 'Something failed' }))

    const service: ContentService = new ContentService(new ContentClient(fakeContentUrl))
    const result = await service.uploadContent(rootCID, files, '', '', true)

    expect(result).to.be.false
  })
})

function buildStatusResponse(manifest: ContentIdentifier[], uploaded: boolean): any {
  const statusResponse = {}
  manifest.forEach(content => {
    statusResponse[content.cid] = uploaded
  })
  return statusResponse
}
