import test from 'ava'

import {
  ContentUploadRequest,
  RequestMetadata,
  ContentIdentifier
} from '../../../../src/lib/content/ContentUploadRequest'
import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { Project, IFile } from '../../../../src/lib/Project'

function buildMetadata(rootCID: string): RequestMetadata {
  return {
    value: rootCID,
    signature: '',
    pubKey: '',
    validityType: 1,
    validity: new Date(),
    sequence: 1
  }
}

function exctractContent(f): Map<string, string> {
  const content = new Map<string, string>()
  f._streams.forEach((item, index) => {
    if (!isFunction(item) && !(item instanceof Buffer)) {
      let result = item.match(/.* name="(.*)".*filename="(.*)"/)
      if (result != null) {
        content.set(result[1], result[2])
      } else {
        let result = item.match(/.* name="(.*)"/)
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

test('Unit - ContentUploadRequest - should be properly generated', async t => {
  const project: Project = new Project('test/unit/resources/data')
  const files: IFile[] = await project.getFiles()
  const rootCID: string = await CIDUtils.getFilesComposedCID(files)
  const manifest: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile(files)
  const metadata: RequestMetadata = buildMetadata(rootCID)

  const uploadRequest: ContentUploadRequest = new ContentUploadRequest(
    rootCID,
    files,
    manifest,
    metadata
  )

  const form = exctractContent(uploadRequest.requestContent())

  t.is(form.get('metadata'), JSON.stringify(metadata))
  t.is(form.get(rootCID), JSON.stringify(manifest))

  manifest.forEach(content => {
    t.is(form.get(content.cid), content.name)
  })
})
