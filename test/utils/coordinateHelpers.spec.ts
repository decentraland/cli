import { expect, use } from 'chai'
const chaiAsPromised = require('chai-as-promised')
import * as fs from 'fs-extra'
import * as coordinateHelpers from '../../src/utils/coordinateHelpers'

use(chaiAsPromised)

describe('validations util', () => {
  describe('validateCoordinates', () => {
    it('should resolve true for a single valid coordinate', async () => {
      const result = await coordinateHelpers.validateCoordinates('1,1')
      expect(result).to.be.true
    })

    it('should resolve true for a valid set of coordinates', async () => {
      const result = await coordinateHelpers.validateCoordinates('1,1; 2,2; 3,1; 999,999')
      expect(result).to.be.true
    })

    it('should resolve true for a valid set of coordinates', async () => {
      const result = await coordinateHelpers.validateCoordinates('1,1; 2,2; 3,1; 999,999')
      expect(result).to.be.true
    })

    it('should resolve true for an empty set of coordinates', async () => {
      const result = await coordinateHelpers.validateCoordinates('')
      const result2 = await coordinateHelpers.validateCoordinates('   ')
      expect(result).to.be.true
      expect(result2).to.be.true
    })

    it('should reject for an invalid set of coordinates', async () => {
      expect(coordinateHelpers.validateCoordinates('1,1;1,2')).to.be['rejectedWith']('Invalid coordinate 1,1;1,2')
      expect(coordinateHelpers.validateCoordinates('1,')).to.be['rejectedWith']('Invalid coordinate 1,')
      expect(coordinateHelpers.validateCoordinates('9999')).to.be['rejectedWith']('Invalid coordinate 9999')
      expect(coordinateHelpers.validateCoordinates('9,9,9,9')).to.be['rejectedWith']('Invalid coordinate 9,9,9,9')
      expect(coordinateHelpers.validateCoordinates('`1,1')).to.be['rejectedWith']('Invalid coordinate `1,1')
      expect(coordinateHelpers.validateCoordinates(' 1,1')).to.be['rejectedWith']('Invalid coordinate  1,1')
    })
  })

  describe('parseCoordinates', () => {
    it('should parse a single valid coordinate', () => {
      const result = coordinateHelpers.parseCoordinates('1,1')
      expect(result).to.deep.equal(['1,1'])
    })

    it('should parse a set of valid coordinates', () => {
      const result = coordinateHelpers.parseCoordinates('1,1; 2,2; 99,99')
      expect(result).to.deep.equal(['1,1', '2,2', '99,99'])
    })

    it('should parse a single coordinate with extra spaces', () => {
      const result = coordinateHelpers.parseCoordinates(' 1,1  ')
      const result2 = coordinateHelpers.parseCoordinates('  1,1')
      const result3 = coordinateHelpers.parseCoordinates('1,1  ')

      expect(result).to.deep.equal(['1,1'])
      expect(result2).to.deep.equal(['1,1'])
      expect(result3).to.deep.equal(['1,1'])
    })

    it('should parse a set of coordinates with extra spaces', () => {
      const result = coordinateHelpers.parseCoordinates(' 1,1; 1,2; 1,3')
      const result2 = coordinateHelpers.parseCoordinates('1,1; 1,2; 1,3 ')
      const result3 = coordinateHelpers.parseCoordinates('    1,1; 1,2; 1,3    ')

      expect(result).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(result2).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(result3).to.deep.equal(['1,1', '1,2', '1,3'])
    })

    it('should parse a single coordinate with leading zeroes', () => {
      const result = coordinateHelpers.parseCoordinates('01,01')
      const result2 = coordinateHelpers.parseCoordinates('010,0001')
      const result3 = coordinateHelpers.parseCoordinates('0001,010')
      const result4 = coordinateHelpers.parseCoordinates('0000,000')
      const result5 = coordinateHelpers.parseCoordinates('  0001,010  ')

      expect(result).to.deep.equal(['1,1'])
      expect(result2).to.deep.equal(['10,1'])
      expect(result3).to.deep.equal(['1,10'])
      expect(result4).to.deep.equal(['0,0'])
      expect(result5).to.deep.equal(['1,10'])
    })

    it('should parse set of coordinates with leading zeroes', () => {
      const result = coordinateHelpers.parseCoordinates('01,01; 01,01')
      const result2 = coordinateHelpers.parseCoordinates('099,0001; 01,1; 11,1')
      const result3 = coordinateHelpers.parseCoordinates('1,1; 0001,010')
      const result4 = coordinateHelpers.parseCoordinates('    1,1;   0001,0999  ')

      expect(result).to.deep.equal(['1,1', '1,1'])
      expect(result2).to.deep.equal(['99,1', '1,1', '11,1'])
      expect(result3).to.deep.equal(['1,1', '1,10'])
      expect(result4).to.deep.equal(['1,1', '1,999'])
    })

    it('should parse a single coordinate with negative zeroes', () => {
      const result = coordinateHelpers.parseCoordinates('-01,-01')
      const result2 = coordinateHelpers.parseCoordinates('-010,-0001')
      const result3 = coordinateHelpers.parseCoordinates('-0,-0001')
      const result4 = coordinateHelpers.parseCoordinates(' -0,-0  ')

      expect(result).to.deep.equal(['-1,-1'])
      expect(result2).to.deep.equal(['-10,-1'])
      expect(result3).to.deep.equal(['0,-1'])
      expect(result4).to.deep.equal(['0,0'])
    })

    it('should parse set of coordinates with negative zeroes', () => {
      const result = coordinateHelpers.parseCoordinates('-01,01; 01,-01')
      const result2 = coordinateHelpers.parseCoordinates('-010,-0001; 01,1; 11,1')
      const result3 = coordinateHelpers.parseCoordinates('1,1; -0001,010')
      const result4 = coordinateHelpers.parseCoordinates('    1,1;   0001,-010  ')
      const result5 = coordinateHelpers.parseCoordinates(' 000,-000;   000,-0  ')

      expect(result).to.deep.equal(['-1,1', '1,-1'])
      expect(result2).to.deep.equal(['-10,-1', '1,1', '11,1'])
      expect(result3).to.deep.equal(['1,1', '-1,10'])
      expect(result4).to.deep.equal(['1,1', '1,-10'])
      expect(result5).to.deep.equal(['0,0', '0,0'])
    })
  })
})
