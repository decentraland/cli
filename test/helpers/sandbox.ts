import * as fs from 'fs-extra'
import * as path from 'path'
import * as rimraf from 'rimraf'

export function tmpTest(fn: any) {
  return new Promise(async (resolve, reject) => {
    const name = 'test-' + (+Date.now()).toString() + (Math.random() * 10).toString()
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
      reject(e)
      rimraf(dir)
    }
  })
}
