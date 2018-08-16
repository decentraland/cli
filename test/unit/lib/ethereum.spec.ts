import { expect, use } from 'chai'
import { sandbox } from 'sinon'

import { Ethereum } from '../../../src/lib/Ethereum'

const ctx = sandbox.create()

describe('Ethereum', () => {
  beforeEach(() => {
    // stubs go here
  })

  afterEach(() => {
    // completely restore all fakes created through the sandbox
    ctx.restore()
  })

  describe('decodeLandData()', () => {
    const eth = new Ethereum()

    expect(eth['decodeLandData']('0,"myLand","my description","QmYeRMVLAtHCzGUbFSBbTTSUYx4AnqHZWwXAy5jzVJSpCE"')).to.deep.equal({
      version: 0,
      name: 'myLand',
      description: 'my description',
      ipns: 'QmYeRMVLAtHCzGUbFSBbTTSUYx4AnqHZWwXAy5jzVJSpCE'
    })

    expect(eth['decodeLandData']('"asd","myLand","my description","QmYeRMVLAtHCzGUbFSBbTTSUYx4AnqHZWwXAy5jzVJSpCE"')).to.be.null

    expect(eth['decodeLandData']('0,"myLand","my description",')).to.deep.equal({
      version: 0,
      name: 'myLand',
      description: 'my description',
      ipns: null
    })

    expect(eth['decodeLandData']('0,,,')).to.deep.equal({
      version: 0,
      name: null,
      description: null,
      ipns: null
    })

    expect(eth['decodeLandData']('0,"",,"QmYeRMVLAtHCzGUbFSBbTTSUYx4AnqHZWwXAy5jzVJSpCE"')).to.deep.equal({
      version: 0,
      name: null,
      description: null,
      ipns: 'QmYeRMVLAtHCzGUbFSBbTTSUYx4AnqHZWwXAy5jzVJSpCE'
    })
  })
})
