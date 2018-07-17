import * as fs from 'fs-extra'
import * as path from 'path'
import { assert, expect } from 'chai'
import puppeteer from 'puppeteer'
import dappeteer from 'dappeteer'

import { tmpTest } from '../../sandbox'
import Commando, { Response } from './Commando'
import { NodeConnectionFactory } from '../helpers'

function dclInitCommando(dirPath: string): Commando {
  return new Commando(`node ${path.resolve('bin', 'dcl')} init`, { silent: true, workingDir: dirPath, env: { DCL_ENV: 'dev' } })
    .when(/Scene title/, () => 'My test Scene\n')
    .when(/Your ethereum address/, () => '0x\n')
    .when(/Your name/, () => 'John Titor\n')
    .when(/Your email/, () => 'john.titor@example.com\n')
    .when(/Parcels comprising the scene/, () => '0,0\n')
    .when(/Which type of project would you like to generate/, () => 'static\n')
    .endWhen(/Installing dependencies/)
}

describe('deploy command', async () => {
  it('should display files before upload', async () => {
    await tmpTest(async (dirPath, done) => {
      dclInitCommando(dirPath).on('end', async () => {
        new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, {
          silent: true,
          workingDir: dirPath,
          env: { DCL_ENV: 'dev' }
        })
          .when(/\(.* bytes\)\n/, msg => {
            const file = msg.trim().match(/(\w*\.\w*)/g)
            expect(file.includes('scene.json'), 'expect scene.json to be listed').to.be.true
            return null
          })
          .when(/\(.* bytes\)\n/, msg => {
            const file = msg.trim().match(/(\w*\.\w*)/g)
            expect(file.includes('scene.xml'), 'expect scene.xml to be listed').to.be.true
            return null
          })
          .when(/You are about to upload/, (msg: string) => {
            expect(msg.includes('You are about to upload 2 files'), 'expect file count to be correct').to.be.true
            return Response.NO
          })
          .on('end', async () => {
            done()
          })
      })
    })
  }).timeout(5000)

  it('should successfully deploy a decentraland scene', async () => {
    const nodeConnectionFactory = new NodeConnectionFactory()
    const blockchainNode = nodeConnectionFactory.createServer()

    blockchainNode.listen(8545, err => {
      if (err) {
        assert.fail(err)
      }
    })

    await tmpTest(async (dirPath, done) => {
      dclInitCommando(dirPath).on('end', async () => {
        new Commando(`node ${path.resolve('bin', 'dcl')} deploy`, { silent: true, workingDir: dirPath, env: { DCL_ENV: 'dev' } })
          .when(/\(.* bytes\)\n/, msg => {
            const file = msg.trim().match(/(\w*\.\w*)/g)
            expect(file.includes('scene.json'), 'expect scene.json to be listed').to.be.true
            return null
          })
          .when(/\(.* bytes\)\n/, msg => {
            const file = msg.trim().match(/(\w*\.\w*)/g)
            expect(file.includes('scene.xml'), 'expect scene.xml to be listed').to.be.true
            return null
          })
          .when(/You are about to upload/, (msg: string) => {
            expect(msg.includes('You are about to upload 2 files'), 'expect file count to be correct').to.be.true
            return Response.YES
          })
          .when(/Linking app ready at/, () => {
            testWithMetamask()
            return ''
          })
          .on('end', async () => {
            done()
          })
      })
    })
  }).timeout(60000)
})

async function testWithMetamask() {
  const browser = await dappeteer.launch(puppeteer)
  const metamask = await dappeteer.getMetamask(browser)

  await metamask.importAccount('12 words here')
  await metamask.switchNetwork('ropsten')

  const page = await browser.newPage()
  await page.goto('http://localhost:8000/linker')
  const deployButton = await page.$('.ui.primary.button')
  await deployButton.click()
  await metamask.confirmTransaction()

  const { href: etherscanLink } = await page.$('a')
  expect(etherscanLink.match(/^https:\/\/etherscan.io\/tx\//)).to.not.be.null
}
