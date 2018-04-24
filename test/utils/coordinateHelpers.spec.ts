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
      expect(coordinateHelpers.validateCoordinates('asd')).to.be['rejectedWith']('Invalid coordinate asd')
      expect(coordinateHelpers.validateCoordinates('Infinity,-Infinity')).to.be['rejectedWith']('Invalid coordinate Infinity,-Infinity')
      expect(coordinateHelpers.validateCoordinates('0,NaN')).to.be['rejectedWith']('Invalid coordinate 0,NaN')
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
      expect(coordinateHelpers.parseCoordinates(' 1,1  ')).to.deep.equal(['1,1'])
      expect(coordinateHelpers.parseCoordinates('  1,1')).to.deep.equal(['1,1'])
      expect(coordinateHelpers.parseCoordinates('1,1  ')).to.deep.equal(['1,1'])
    })

    it('should parse a set of coordinates with extra spaces', () => {
      expect(coordinateHelpers.parseCoordinates(' 1,1; 1,2; 1,3')).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(coordinateHelpers.parseCoordinates('1,1; 1,2; 1,3 ')).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(coordinateHelpers.parseCoordinates('    1,1; 1,2; 1,3    ')).to.deep.equal(['1,1', '1,2', '1,3'])
    })

    it('should parse a single coordinate with leading zeroes', () => {
      expect(coordinateHelpers.parseCoordinates('01,01')).to.deep.equal(['1,1'])
      expect(coordinateHelpers.parseCoordinates('010,0001')).to.deep.equal(['10,1'])
      expect(coordinateHelpers.parseCoordinates('0001,010')).to.deep.equal(['1,10'])
      expect(coordinateHelpers.parseCoordinates('0000,000')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parseCoordinates('  0001,010  ')).to.deep.equal(['1,10'])
    })

    it('should parse set of coordinates with leading zeroes', () => {
      expect(coordinateHelpers.parseCoordinates('01,01; 01,01')).to.deep.equal(['1,1', '1,1'])
      expect(coordinateHelpers.parseCoordinates('099,0001; 01,1; 11,1')).to.deep.equal(['99,1', '1,1', '11,1'])
      expect(coordinateHelpers.parseCoordinates('1,1; 0001,010')).to.deep.equal(['1,1', '1,10'])
      expect(coordinateHelpers.parseCoordinates('    1,1;   0001,0999  ')).to.deep.equal(['1,1', '1,999'])
    })

    it('should parse a single coordinate with negative zeroes', () => {
      expect(coordinateHelpers.parseCoordinates('-01,-01')).to.deep.equal(['-1,-1'])
      expect(coordinateHelpers.parseCoordinates('-010,-0001')).to.deep.equal(['-10,-1'])
      expect(coordinateHelpers.parseCoordinates('-0,-0001')).to.deep.equal(['0,-1'])
      expect(coordinateHelpers.parseCoordinates(' -0,-0  ')).to.deep.equal(['0,0'])
    })

    it('should parse set of coordinates with negative zeroes', () => {
      expect(coordinateHelpers.parseCoordinates('-01,01; 01,-01')).to.deep.equal(['-1,1', '1,-1'])
      expect(coordinateHelpers.parseCoordinates('-010,-0001; 01,1; 11,1')).to.deep.equal(['-10,-1', '1,1', '11,1'])
      expect(coordinateHelpers.parseCoordinates('1,1; -0001,010')).to.deep.equal(['1,1', '-1,10'])
      expect(coordinateHelpers.parseCoordinates('    1,1;   0001,-010  ')).to.deep.equal(['1,1', '1,-10'])
      expect(coordinateHelpers.parseCoordinates(' 000,-000;   000,-0  ')).to.deep.equal(['0,0', '0,0'])
    })

    it('should fail to parse invalid coordinates', () => {
      expect(coordinateHelpers.parseCoordinates('NaN')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parseCoordinates('asd')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parseCoordinates('NaN,NaN')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parseCoordinates('Infinity,Infinity')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parseCoordinates('-NaN,-Infinity')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parseCoordinates('NaN,1; NaN,-0; -Infinity,Infinity; asd')).to.deep.equal(['0,1', '0,0', '0,0', '0,0'])
    })
  })
})
