import { spawn } from 'child_process'

// This file tries not having dependencies

export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

export async function getNodeMajorVersion(): Promise<number | boolean> {
  const nodeVersion = process.versions.node
  if (nodeVersion) {
    const majorVersion = parseInt(nodeVersion.split('.')[0])
    if (majorVersion > 0) {
      return majorVersion
    }
  }
  return false
}

export async function getNpmMajorVersion(): Promise<number | boolean> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['-v'])
    let npmVersion: string = ''
    child.stdout.on('data', (data: any) => {
      const arrStr = data.toString().split('.')
      if (arrStr.length === 3) {
        npmVersion = data.toString()
      }
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(false)
      }

      if (npmVersion.length === 0) {
        resolve(false)
      } else {
        resolve(parseInt(npmVersion.split('.')[0]))
      }
    })
  })
}
