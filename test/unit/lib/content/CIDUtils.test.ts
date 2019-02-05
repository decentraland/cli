import * as fs from 'fs-extra'
import test from 'ava'

import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { ContentIdentifier } from '../../../../src/lib/content/ContentUploadRequest'
import { IFile, Project } from '../../../../src/lib/Project'

async function getTestFile(filePath: string) {
  const stat = await fs.stat(filePath)
  const content = await fs.readFile(filePath)
  return { path: 'scene.json', content: Buffer.from(content), size: stat.size }
}

test('Unit - CIDUtils - shold generate the CID of a list of files', async t => {
  const sceneJsonExpectedCID = 'QmfRoY2437YZgrJK9s5Vvkj6z9xH4DqGT1VKp1WFoh6Ec4'
  const sceneJsonfilePath = 'test/unit/resources/data/scene.json'

  const file: IFile = await getTestFile(sceneJsonfilePath)
  const result: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile([file])

  t.is(result[0].cid, sceneJsonExpectedCID)
})

test('Unit - CIDUtils - should generate the CID for all the content', async t => {
  const fullContentExpectedCID = 'QmYaarcZ65C6K58xLpPyVqYLVbdT1KbE5H7TF221jYDaEU'
  const dataFolderPath = 'test/unit/resources/data'

  const project = new Project(dataFolderPath)
  const files = await project.getFiles()
  const result: string = await CIDUtils.getFilesComposedCID(files)

  t.is(result, fullContentExpectedCID)
})
