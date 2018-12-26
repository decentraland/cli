import { expect } from 'chai'

import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { Project, IFile } from '../../../../src/lib/Project'
import { ContentUploadRequest, RequestMetadata, ContentIdentifier } from '../../../../src/lib/content/ContentUploadRequest'
import { string } from 'prop-types'

const dataFolderPath = 'test/unit/resources/data'
const contentNameRegex = '.* name="(.*)"'
const fileNameRegex = '.* name="(.*)".*filename="(.*)"'

describe('ContentUploadRequest', () => {
  it('should be properly generated', async () => {
    const project: Project = new Project(dataFolderPath)
    const files: IFile[] = await project.getFiles()
    const rootCID: string = await CIDUtils.getFilesComposedCID(files)
    const manifest: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile(files)
    const metadata: RequestMetadata = buildMetadata(rootCID)

    const uploadRequest: ContentUploadRequest = new ContentUploadRequest(rootCID, files, manifest, metadata)

    const form = exctractContent(uploadRequest.requestContent())
    expect(form.get('metadata')).to.be.equals(JSON.stringify(metadata))
    expect(form.get(rootCID)).to.be.equals(JSON.stringify(manifest))

    manifest.forEach(content => {
      expect(form.get(content.cid)).to.be.equals(content.name)
    })
  })
})

function buildMetadata(rootCID: string): RequestMetadata {
  return { value: rootCID, signature: '', pubKey: '', validityType: 1, validity: new Date(), sequence: 1 }
}

function exctractContent(f): Map<string, string> {
  const content = new Map<string, string>()
  f._streams.forEach((item, index) => {
    if (!isFunction(item) && !(item instanceof Buffer)) {
      let result = item.match(fileNameRegex)
      if (result != null) {
        content.set(result[1], result[2])
      } else {
        let result = item.match(contentNameRegex)
        if (result != null) {
          content.set(result[1], f._streams[index + 1])
        }
      }
    }
  })
  return content
}
function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply)
}
