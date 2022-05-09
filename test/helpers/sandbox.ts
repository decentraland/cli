import fs from 'fs-extra'
import path from 'path'

type CallbackFn = (path: string, done: () => void) => void

export default function sandbox(fn: CallbackFn) {
  return new Promise(async (resolve, reject) => {
    const name =
      'test-' + (+Date.now()).toString() + (Math.random() * 10).toString()
    const dir = path.resolve(process.cwd(), name)
    await fs.mkdir(dir)

    const done = () => {
      fs.remove(dir, resolve)
    }

    try {
      fn(dir, done)
    } catch (e) {
      fs.remove(dir, () => reject(e))
    }
  })
}

export async function createSandbox(fn: (dirPath: string) => Promise<void>) {
  const name =
    'test-' + (+Date.now()).toString() + (Math.random() * 10).toString()
  const dir = path.resolve(process.cwd(), name)
  await fs.mkdir(dir)
  try {
    await fn(dir)
  } finally {
    await removeSandbox(dir)
  }
}

export function removeSandbox(dirPath: string) {
  return new Promise<void>((resolve, reject) => {
    fs.remove(dirPath, (err) => (err ? reject(err) : resolve()))
  })
}
