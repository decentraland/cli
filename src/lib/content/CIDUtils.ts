import { IFile } from "../Project"
import { ContentIdentifier } from "./ContentUploadRequest"
import imp = require('ipfs-unixfs-engine')
import Importer = imp.Importer

const pull = require('pull-stream')
const MemoryDatastore = require('interface-datastore').MemoryDatastore
const CID = require('cids')

/**
 * Utility class to handle the calculation of a IFile CID
 */
export class CIDUtils {

  /**
   * Retrieves a ContentIdentifier (which contains the CID) for each File
   * @param files Files to calculate the CID
   */
  static async getFilesContentIdentifier(files: IFile[]): Promise<ContentIdentifier[]> {
    const result: ContentIdentifier[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileCID: string = await this.getListCID([file], false)
      result.push({ cid: fileCID, name : file.path })
    }
    return result
  }

  /**
   * Calculates the RootCID for all the files
   * @param files Content to use to calculate the root CID
   */
  static async getFilesComposedCID(files: IFile[]): Promise<string> {
    return this.getListCID(files, true)
  }

  private static async getListCID(files: IFile[], shareRoot: boolean): Promise<string> {
    const importer = new Importer(new MemoryDatastore())
    return new Promise<string>((resolve, reject) => {
      pull(
        pull.values(files),
        pull.asyncMap((file, cb) => {
          const data = {
            path :  shareRoot ? "/tmp/" + file.path : file.path,
            content: file.content
          }
          cb(null, data)
        }),
        importer,
        pull.onEnd(() => importer.flush(
          (err, content) => {
            if (err) {
              reject(err)
            }
            resolve(new CID(content).toBaseEncodedString())
          }
        )
      )
    )
    })
  }
}
