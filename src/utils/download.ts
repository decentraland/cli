import extract from 'extract-zip'
import { rmdirSync } from 'fs'
import { move, readdir, remove, writeFile } from 'fs-extra'
import path from 'path'
import fetch from 'isomorphic-fetch'

export const downloadFile = async function (url: string, dest: string) {
  const data = await (await fetch(url)).arrayBuffer()
  await writeFile(dest, Buffer.from(data))
}

export const downloadRepoZip = async function (url: string, dest: string) {
  const zipFilePath = path.resolve(dest, 'temp-zip-project.zip')
  await downloadFile(url, zipFilePath)

  const oldFiles = await readdir(dest)

  try {
    await extract(zipFilePath, { dir: dest })
  } catch (err) {
    console.error(err)
    throw err
  }

  const newFiles = await readdir(dest)

  const directoryCreated = newFiles.filter((value) => !oldFiles.includes(value))

  if (directoryCreated.length !== 1) {
    throw new Error('asd')
  }

  const extractedPath = path.resolve(dest, directoryCreated[0])
  const filesToMove = await readdir(extractedPath)

  for (const filePath of filesToMove) {
    await move(
      path.resolve(extractedPath, filePath),
      path.resolve(dest, filePath)
    )
  }

  rmdirSync(extractedPath)
  await remove(zipFilePath)
}
