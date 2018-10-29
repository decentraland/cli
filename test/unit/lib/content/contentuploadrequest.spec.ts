import { expect } from 'chai'

import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { Project, IFile } from '../../../../src/lib/Project';
import { ContentUploadRequest, RequestMetadata, ContentIdentifier } from '../../../../src/lib/content/ContentUploadRequest';

const dataFolderPath = "test/unit/resources/data";

describe('ContentUploadRequest', () => {
  it('should be properly generated', async () => {
    const project: Project = new Project(dataFolderPath)
    const files: IFile[] = await project.getFiles()
    const rootCID: string = await CIDUtils.getFilesComposedCID(files)
    const manifest: ContentIdentifier [] = await CIDUtils.getIdentifiersForIndividualFile(files)
    const metadata: RequestMetadata = buildMetadata(rootCID)

    const uploadRequest: ContentUploadRequest = new ContentUploadRequest(rootCID, files, manifest, metadata)

    const form = uploadRequest.requestContent()
    expect(form.metadata).to.be.equals(JSON.stringify(metadata))
    expect(form[rootCID]).to.be.equals(JSON.stringify(manifest))

    manifest.forEach((content) => {
      expect(form[content.cid]).to.be.not.undefined
    })
  })
})

function buildMetadata(rootCID: string): RequestMetadata{
  return {value: rootCID,
    signature: "",
    pubKey: "",
    validityType: 1,
    validity: new Date(),
    sequence: 1}
}