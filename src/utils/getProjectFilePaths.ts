import path from 'path'
import fs from 'fs-extra'
import ignore from 'ignore'

export default async function getProjectFilePaths(
  dir: string,
  ignoreFileContent?: string
): Promise<string[]> {
  const fileNames = (ignore as any)()
    .add(ignoreFileContent)
    .filter(await fs.readdir(dir)) as string[]
  const filePaths = fileNames.map((fileName) => path.resolve(dir, fileName))
  const stats = await Promise.all(
    filePaths.map((filePath) => fs.stat(filePath))
  )
  const files: string[] = []
  const pendingPromises: Promise<unknown>[] = []

  stats.forEach(async (stat, i) => {
    if (stat.isDirectory()) {
      const promise = new Promise((resolve, reject) => {
        getProjectFilePaths(filePaths[i], ignoreFileContent)
          .then((resolvedFilePaths) => {
            const finals = resolvedFilePaths.map((f) =>
              path.join(fileNames[i], f)
            )
            resolve(finals)
          })
          .catch(reject)
      })

      pendingPromises.push(promise)
    } else {
      files.push(fileNames[i])
    }
  })

  const pResults = (await Promise.all(pendingPromises)).reduce(
    (acc: string[], r: any) => {
      acc.push(...r)
      return acc
    },
    []
  )

  return [...files, ...pResults]
}
