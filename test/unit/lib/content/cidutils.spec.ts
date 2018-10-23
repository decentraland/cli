import { expect } from 'chai'
import * as fs from 'fs-extra'

import { CIDUtils } from '../../../../src/lib/content/CIDUtils'
import { ContentIdentifier } from '../../../../src/lib/content/ContentUploadRequest';
import { IFile } from '../../../../src/lib/Project';

const assetFilePath = "test/unit/resources/data/assets/test.txt";
const sceneJsonfilePath = "test/unit/resources/data/scene.json";

const sceneJsonExpectedCID = "QmfRoY2437YZgrJK9s5Vvkj6z9xH4DqGT1VKp1WFoh6Ec4";
const fullContentExpectedCID = "QmcbDbiTdMtrJE4w3hff3UXziKrFC9ssYcfZdK1Um3uSAH";

describe('CIDUtils', () => {
  it('shold generate the CID of a list of files', async () => {
    const file: IFile = await getTestFile(sceneJsonfilePath)
    const result: ContentIdentifier[] = await CIDUtils.getContentIdentifier([file])
    expect(result[0].cid).to.be.equals(sceneJsonExpectedCID)
  })

  it('should generate the CID for all the contnent', async () => {
    const file1: IFile = await getTestFile(sceneJsonfilePath)
    const file2: IFile = await getTestFile(assetFilePath)
    const result: string = await CIDUtils.getContentCID([file1, file2])
    expect(result).to.be.equals(fullContentExpectedCID)
  })
})

async function getTestFile(filePath: string) {
  const stat = await fs.stat(filePath)
  const content = await fs.readFile(filePath)
  return { path: filePath.replace(/\\/g, '/'), content: Buffer.from(content), size: stat.size }
}