import fs from 'fs'
import archiver from 'archiver'

export async function packProject(files: string[], target: string) {
  const output = fs.createWriteStream(target)
  const archive = archiver('zip')

  return new Promise<void>((resolve, reject) => {
    output.on('close', () => {
      resolve()
    })

    archive.on('warning', (err) => {
      reject(err)
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    const targetFiles = files.filter((f) => f !== '')
    targetFiles.forEach((f) => {
      archive.file(f, { name: f })
    })

    return archive.finalize()
  })
}
