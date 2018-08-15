import * as fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'
import * as sinon from 'sinon'

import { Analytics } from '../../../src/utils/analytics'
import { tmpTest } from '../../sandbox'
import Commando, { Response } from './Commando'

describe('init command (with mocked analytics)', async () => {
  it('should successfully create a static project', async () => {
    let analyticsExecuted = false
    const analyticsSceneCreatedStub = new Promise(resolve =>
      setTimeout(() => {
        analyticsExecuted = true
        resolve()
      }, 200)
    )
    sinon.stub(Analytics, 'sceneCreated').returns(analyticsSceneCreatedStub)

    expect(analyticsExecuted).to.be.false
    await tmpTest(async (dirPath, done) => {
      new Commando(`node ${path.resolve('bin', 'dcl')} init`, {
        silent: true,
        workingDir: dirPath,
        env: { DCL_ENV: 'dev' }
      })
        .when(/Send anonymous usage stats to Decentraland?/, () => Response.YES)
        .when(/Scene title/, () => 'My test Scene\n')
        .when(/Your ethereum address/, () => '0x\n')
        .when(/Your name/, () => 'John Titor\n')
        .when(/Your email/, () => 'john.titor@example.com\n')
        .when(/Parcels comprising the scene/, () => '0,0\n')
        .when(/Which scene template would you like to generate/, () => '4\n')
        .endWhen(/Installing dependencies/)
        .on('err', e => console.log(e))
        .on('end', async () => {
          // Test that analytics where sent
          expect(analyticsExecuted).to.be.true
          Analytics.sceneCreated.restore()
          done()
        })
    })
  }).timeout(5000)
})
