import * as fs from 'fs-extra'
import * as path from 'path'
import * as rimraf from 'rimraf'

export const TIMEOUT_MS = process.env.TEST_TIMEOUT || process.env.APPVEYOR ? 20000 : 10000

export function tmpTest(fn: any) {
  return new Promise(async (resolve, reject) => {
    const name = 'test-' + (+Date.now()).toString()
    const dir = path.resolve(process.cwd(), name)
    await fs.mkdir(dir)
    const done = () => {
      rimraf(dir, () => {
        resolve()
      })
    }

    try {
      fn(dir, done)
    } catch (e) {
      rimraf(dir, () => {
        reject(e)
      })
    }
  })
}
