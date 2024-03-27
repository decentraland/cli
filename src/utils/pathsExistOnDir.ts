import path from 'path'
import fs from 'fs-extra'

export default function pathsExistOnDir(dir: string, filepaths: string[]): Promise<boolean[]> {
  return Promise.all(filepaths.map((f) => fs.pathExists(path.resolve(dir, f))))
}
