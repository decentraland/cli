import * as fs from 'fs-extra'
import * as path from 'path'
import { expect } from 'chai'
import * as sinon from 'sinon'

import { Analytics } from '../../../src/utils/analytics'
import { tmpTest, TIMEOUT_MS } from '../../sandbox'
import Commando, { Response } from './Commando'

describe('init command (with mocked analytics)', async () => {
  it('should successfully create a static project', async () => {
    let sceneCreatedExecuted = false
    let sendDataExecuted = false

    const analyticsSceneCreatedStub = new Promise(resolve =>
      setTimeout(() => {
        sceneCreatedExecuted = true
        resolve()
      }, 200)
    )
    const analyticsSendDataStub = new Promise(resolve =>
      setTimeout(() => {
        sendDataExecuted = true
        resolve()
      }, 200)
    )

    sinon.stub(Analytics, 'sceneCreated').returns(analyticsSceneCreatedStub)
    sinon.stub(Analytics, 'sendData').returns(analyticsSendDataStub)

    expect(sceneCreatedExecuted).to.be.false
    expect(sendDataExecuted).to.be.false
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
          expect(sceneCreatedExecuted).to.be.true
          expect(sendDataExecuted).to.be.true
          Analytics.sceneCreated['restore']()
          Analytics.sendData['restore']()
          done()
        })
    })
  }).timeout(TIMEOUT_MS)
})
