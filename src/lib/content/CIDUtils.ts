import { IFile } from "../Project"
import { ContentIdentifier } from "./ContentUploadRequest"
import dag = require('ipld-dag-pb')
import DAGNode = dag.DAGNode
import Unix = require('ipfs-unixfs')
import imp = require('ipfs-unixfs-engine')
import Importer = imp.Importer

const pull = require('pull-stream')
const MemoryDatastore = require('interface-datastore').MemoryDatastore
const CID = require('cids')

export class CIDUtils {

  static async getContentIdentifier(files: IFile[]): Promise<ContentIdentifier[]> {
    const result: ContentIdentifier[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileCID: string = await this.getCID(file.content)
      result.push({ cid: fileCID, name : file.path })
    }
    return result
  }

  static async getContentCID(files: IFile[]): Promise<string> {
    const importer = new Importer(new MemoryDatastore())
    return new Promise<string>((resolve, reject) => {
      pull(
        pull.values(files),
        pull.asyncMap((file, cb) => {
          const data = {
            path : "/tmp/" + file.path,
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

  private static getCID(buffer: Buffer): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      DAGNode.create(new Unix('file', buffer).marshal(), (err, node1) => {
        if (err) {
          reject("Fail to calculate CID")
        }
        resolve(node1.toJSON().multihash)
      })
    })
  }
}
