import * as fs from 'fs-extra'
import { expect } from 'chai'
import { sandbox } from 'sinon'

import * as filesystem from '../../../src/utils/filesystem'

const ctx = sandbox.create()

describe('filesystem util', () => {
  let readJSONStub
  let outputFileStub

  beforeEach(() => {
    outputFileStub = ctx.stub(fs, 'outputFile').callsFake(() => undefined)
    readJSONStub = ctx.stub(filesystem, 'readJSON').callsFake(() => {
      return '{ "display": { "title": "hungry_goldstine" }, "owner": "", "contact": { "name": "", "email": "" }, "scene": { "parcels": [ "0,0" ], "base": "0,0" }, "communications": { "type": "webrtc", "signalling": "https://rendezvous.decentraland.org" }, "policy": { "fly": true, "voiceEnabled": true, "blacklist": [], "teleportPosition": "0,0,0" }, "main": "scene.xml" }'
    })
  })

  afterEach(function() {
    // completely restore all fakes created through the sandbox
    ctx.restore()
  })

  describe('writeJSON', () => {
    it('should merge current and new content', async () => {
      await filesystem.writeJSON('scene.json', { main: 'scene.js' })
      expect(
        outputFileStub.withArgs(
          'scene.json',
          '{ "display": { "title": "hungry_goldstine" }, "owner": "", "contact": { "name": "", "email": "" }, "scene": { "parcels": [ "0,0" ], "base": "0,0" }, "communications": { "type": "webrtc", "signalling": "https://rendezvous.decentraland.org" }, "policy": { "fly": true, "voiceEnabled": true, "blacklist": [], "teleportPosition": "0,0,0" }, "main": "scene.js" }'
        ),
        'expect main field to be scene.js'
      )
    })
  })
})
