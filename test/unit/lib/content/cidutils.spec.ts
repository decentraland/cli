import { expect } from 'chai'
import * as fs from 'fs-extra'

import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { ContentIdentifier } from '../../../../src/lib/content/ContentUploadRequest';
import { IFile, Project } from '../../../../src/lib/Project';

const dataFolderPath = "test/unit/resources/data";
const sceneJsonfilePath = "test/unit/resources/data/scene.json";

const sceneJsonExpectedCID = "QmfRoY2437YZgrJK9s5Vvkj6z9xH4DqGT1VKp1WFoh6Ec4";
const fullContentExpectedCID = "QmYaarcZ65C6K58xLpPyVqYLVbdT1KbE5H7TF221jYDaEU";

describe('CIDUtils', () => {
  it('shold generate the CID of a list of files', async () => {
    const file: IFile = await getTestFile(sceneJsonfilePath)
    const result: ContentIdentifier[] = await CIDUtils.getIdentifiersForIndividualFile([file])
    expect(result[0].cid).to.be.equals(sceneJsonExpectedCID)
  })

  it('should generate the CID for all the content', async () => {
    const project = new Project(dataFolderPath)
    const files = await project.getFiles()
    const result: string = await CIDUtils.getFilesComposedCID(files)
    expect(result).to.be.equals(fullContentExpectedCID)
  })
})

async function getTestFile(filePath: string) {
  const stat = await fs.stat(filePath)
  const content = await fs.readFile(filePath)
  return { path: "scene.json", content: Buffer.from(content), size: stat.size }
}