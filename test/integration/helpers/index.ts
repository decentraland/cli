import * as fs from 'fs-extra'
import path from 'path'

export async function setupFilesystem(
  dirPath: string,
  files: { path: string; content: string }[]
) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.resolve(dirPath, file.path)
    const fileDir = path.dirname(filePath)

    if (fileDir !== dirPath) {
      await fs.mkdirp(fileDir)
    }

    await fs.writeFile(filePath, file.content)
  }
}
