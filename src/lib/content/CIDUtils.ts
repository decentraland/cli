import * as path from 'path'
import * as pull from 'pull-stream'
import * as CID from 'cids'
import { MemoryDatastore } from 'interface-datastore'
import * as imp from 'ipfs-unixfs-engine'

import { ContentIdentifier } from './ContentUploadRequest'
import { IFile } from '../Project'

import Importer = imp.Importer

/**
 * Utility class to handle the calculation of a IFile CID
 */
export namespace CIDUtils {
  /**
   * Retrieves a ContentIdentifier (which contains the CID) for each File
   * The path is ignored, it only uses the file name.
   * @param files Files to calculate the CID
   */
  export async function getIdentifiersForIndividualFile(
    files: IFile[]
  ): Promise<ContentIdentifier[]> {
    const result: ContentIdentifier[] = []
    for (const file of files) {
      const fileCID: string = await getListCID(
        [{ path: path.basename(file.path), content: file.content, size: file.size }],
        false
      )
      result.push({ cid: fileCID, name: file.path })
    }
    return result
  }

  /**
   * Calculates the RootCID for all the files
   * @param files Content to use to calculate the root CID
   */
  export function getFilesComposedCID(files: IFile[]): Promise<string> {
    return getListCID(files, true)
  }

  async function getListCID(files: IFile[], shareRoot: boolean): Promise<string> {
    const importer = new Importer(new MemoryDatastore())
    return new Promise<string>((resolve, reject) => {
      pull(
        pull.values(files),
        pull.asyncMap((file, cb) => {
          const data = {
            path: shareRoot ? '/tmp/' + file.path : file.path,
            content: file.content
          }
          cb(null, data)
        }),
        importer,
        pull.onEnd(() =>
          importer.flush((err, content) => {
            if (err) {
              reject(err)
            }
            resolve(new CID(content).toBaseEncodedString())
          })
        )
      )
    })
  }
}
