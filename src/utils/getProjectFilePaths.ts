import * as path from 'path'
import * as fs from 'fs-extra'
import * as ignore from 'ignore'

export default async function getProjectFilePaths(
  dir: string = process.cwd(),
  ignoreFileContent?: string
): Promise<string[]> {
  const fileNames = await fs.readdir(dir)
  const filePaths = fileNames.map(fileName => path.resolve(dir, fileName))
  const stats = await Promise.all(filePaths.map(filePath => fs.stat(filePath)))

  const files = []
  const pendingPromises = []

  stats.forEach(async (stat, i) => {
    if (stat.isDirectory()) {
      const promise = new Promise((resolve, reject) => {
        getProjectFilePaths(filePaths[i], ignoreFileContent)
          .then(resolvedFilePaths => {
            const finals = resolvedFilePaths.map(f => path.join(fileNames[i], f))
            resolve(finals)
          })
          .catch(reject)
      })

      pendingPromises.push(promise)
    } else {
      files.push(fileNames[i])
    }
  })

  const result = (ignore as any)()
    .add(ignoreFileContent)
    .filter(files)

  const pResults = (await Promise.all(pendingPromises)).reduce((acc: string[], r) => {
    acc.push(...r)
    return acc
  }, [])

  return [...result, ...pResults]
}
