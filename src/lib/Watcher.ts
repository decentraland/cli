import * as chokidar from 'chokidar'
import * as fs from 'fs-extra'
import future from 'fp-future'
import * as glob from 'glob'
import * as ignore from 'ignore'

import { debouncer } from '../utils/debouncer'
import { error } from '../utils/logging'
import { CIDUtils } from './content/CIDUtils'
import { IFile } from './Project'
import { resolve } from 'path'

type Ignorer = {
  add(path: string | string[]): Ignorer
  ignores(path: string): boolean
}

export function relativiseUrl(url: string, root: string) {
  url = url.replace(/[\/\\]/g, '/')
  const newRoot = root.replace(/\//g, '/').replace(/\\/g, '/')

  if (newRoot.endsWith('/')) {
    return url.replace(newRoot, '')
  } else {
    return url.replace(newRoot + '/', '')
  }
}

export async function getIFile(file: string, base: string): Promise<IFile | null> {
  const filePath = resolve(base, file)

  const stat = await fs.lstat(filePath)

  if (!stat.isFile()) return null

  const content = await fs.readFile(filePath)

  return {
    path: file.replace(/\\/g, '/'),
    content: Buffer.from(content),
    size: stat.size
  }
}

export class Watcher {
  public readonly onProcessingComplete: Array<() => void> = []
  public readonly initialMappingsReady = future<void>()

  private ig: Ignorer
  private modifiedFiles = new Array<string>()

  private startProcessing = debouncer(() => {
    this.processModifiedFiles().catch($ => console.error(error($)))
  }, 300)

  private notifyObservers = debouncer(() => {
    // notify all listeners
    this.onProcessingComplete.forEach($ => $())
  }, 300)

  private mappings = new Map<string, string>()
  private watching = false

  constructor(public path: string, ignoredPaths: string) {
    this.ig = (ignore as any)().add(ignoredPaths.split(/\n/g).map($ => $.trim()))
    this.initMappings()
  }

  public resolveCID(cid: string): string | null {
    for (let [value, key] of this.mappings) {
      if (cid === key) {
        return resolve(this.path, value)
      }
    }
    return null
  }

  public watch() {
    if (this.watching) return
    this.watching = true

    chokidar.watch(this.path).on('all', (event: any, path: string) => {
      if (!this.ig.ignores(path)) {
        const normalizedFile = relativiseUrl(path, this.path)

        if (event === 'unlink') {
          this.mappings.delete(normalizedFile)
          this.notifyObservers()
        } else {
          if (!this.modifiedFiles.includes(normalizedFile)) {
            this.modifiedFiles.push(normalizedFile)
          }
          this.startProcessing()
        }
      }
    })
  }

  // returns an usable mappings list
  public getMappings() {
    const contents = []

    this.mappings.forEach((hash, file) => contents.push({ file, hash }))

    return {
      contents,
      parcel_id: '0,0',
      publisher: '0x0000000000000000000000000000000000000000',
      root_cid: this.mappings.get('scene.json') || 'Qm0000000000000000000000000000000000000000'
    }
  }

  private initMappings() {
    glob(this.path + '/**/*', { nodir: true }, (err, files) => {
      if (err) {
        this.initialMappingsReady.reject(err)
      } else {
        files.forEach(path => {
          if (!this.ig.ignores(path)) {
            const normalizedFile = relativiseUrl(path, this.path)
            if (!this.modifiedFiles.includes(normalizedFile)) {
              this.modifiedFiles.push(normalizedFile)
            }
          }
        })

        this.processModifiedFiles()
          .then($ => this.initialMappingsReady.resolve($))
          .catch($ => this.initialMappingsReady.reject($))
      }
    })
  }

  private async processModifiedFiles() {
    let didChangeSomething = false
    while (this.modifiedFiles.length > 0) {
      const file = this.modifiedFiles.shift()
      const iFile = await getIFile(file, this.path)
      if (iFile) {
        const results = await CIDUtils.getIdentifiersForIndividualFile([iFile])

        if (results.length) {
          const previousValue = this.mappings.get(file)
          this.mappings.set(file, results[0].cid)
          if (previousValue !== results[0].cid) {
            didChangeSomething = true
          }
        }
      }
    }
    if (didChangeSomething) {
      this.notifyObservers()
    }
  }
}
