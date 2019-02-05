import * as fs from 'fs-extra'
import * as path from 'path'
import test from 'ava'
import * as puppeteer from 'puppeteer'

import { isDebug } from '../../src/utils/env'
import Commando, { Response } from '../helpers/commando'
import { tmpTest } from '../helpers/sandbox'

function initProject(dirPath): Promise<void> {
  return new Promise((resolve, reject) => {
    new Commando(`node ${path.resolve('bin', 'dcl')} init`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    })
      .when(/Send anonymous usage stats to Decentraland?/, () => Response.NO)
      .endWhen(/Installing dependencies/)
      .on('err', reject)
      .on('end', resolve)
  })
}

function startProject(dirPath): Promise<Commando> {
  return new Promise(resolve => {
    const command = new Commando(`node ${path.resolve('bin', 'dcl')} start --no-browser`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development' }
    }).when(/to exit/, async () => {
      resolve(command)
    })
  })
}

function statusProject(): Promise<string> {
  return new Promise(resolve => {
    let allData = ''
    new Commando(
      `node ${path.resolve('bin', 'dcl')} status --network ropsten 0,0`,
      {
        silent: !isDebug(),
        workingDir: '.',
        env: { NODE_ENV: 'development' }
      },
      data => (allData += data)
    ).on('end', async () => {
      resolve(allData)
    })
  })
}

function deployProject(dirPath): Promise<void> {
  return new Promise(resolve => {
    new Commando(`node ${path.resolve('bin', 'dcl')} deploy --yes --network ropsten`, {
      silent: !isDebug(),
      workingDir: dirPath,
      env: { NODE_ENV: 'development', DCL_PRIVATE_KEY: process.env.CI_DCL_PRIVATE_KEY }
    }).on('end', async () => {
      resolve()
    })
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

test('E2E - full new user workflow of CLI (only CI test)', async t => {
  if (!process.env.CI_DCL_PRIVATE_KEY) {
    return t.pass('Missing CI_DCL_PRIVATE_KEY for full CI test')
  }

  let browser: puppeteer.Browser

  try {
    await tmpTest(async (dirPath, done) => {
      await initProject(dirPath)

      // Remove rotation line
      let gameFile = await fs.readFile(path.resolve(dirPath, 'src', 'game.ts'), {
        encoding: 'utf8'
      })
      gameFile = gameFile.replace('engine.addSystem(new RotatorSystem())', '')
      await fs.writeFile(path.resolve(dirPath, 'src', 'game.ts'), gameFile, {
        encoding: 'utf8'
      })

      const startCmd = await startProject(dirPath)

      browser = await puppeteer.launch({ headless: !isDebug() })

      // Assert if preview shows the cube
      const page = await browser.newPage()
      await page.goto('http://localhost:8000')
      await page.waitForSelector('#main-canvas')

      const snapshotPreview = await fs.readFile(
        path.resolve(__dirname, './snapshots/dcl-preview.png')
      )
      const imagePreview = await page.screenshot({
        encoding: 'binary',
        path: path.resolve(dirPath, 'dcl-preview.png')
      })

      browser.close()
      t.is(Buffer.compare(snapshotPreview, imagePreview), 0)

      // With this random content we can change the CID and verify successful deployment
      const randomString = Math.random()
        .toString(36)
        .substring(7)

      // Asset that hotreloading changes preview
      // TODO also tests websockets
      gameFile = gameFile.replace('spawnCube(5, 1, 5)', `spawnCube(5, 5, 5) // ${randomString}`)
      await fs.writeFile(path.resolve(dirPath, 'src', 'game.ts'), gameFile, {
        encoding: 'utf8'
      })
      await page.reload()
      await page.waitForSelector('#main-canvas')
      const snapshotModified = await fs.readFile(
        path.resolve(__dirname, './snapshots/dcl-preview-modified.png')
      )
      const imageModified = await page.screenshot({
        encoding: 'binary',
        path: path.resolve(dirPath, path.resolve(dirPath, './snapshots/dcl-preview-modified.png'))
      })

      t.is(Buffer.compare(snapshotModified, imageModified), 0)

      const statusBefore = await statusProject()
      await deployProject(dirPath)
      const statusAfter = await statusProject()
      t.not(statusBefore, statusAfter)

      await startCmd.end()
      done()
    })
  } catch (error) {
    if (!isDebug()) {
      browser.close()
    }
    throw error
  }
})
