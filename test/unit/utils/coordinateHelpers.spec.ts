import { expect, use } from 'chai'
const chaiAsPromised = require('chai-as-promised')
import * as coordinateHelpers from '../../../src/utils/coordinateHelpers'

use(chaiAsPromised)

describe('coordinateHelpers', () => {
  describe('validate', () => {
    it('should resolve true for a single valid coordinate', async () => {
      const result = await coordinateHelpers.validate('1,1')
      expect(result).to.be.true
    })

    it('should resolve true for a valid set of coordinates', async () => {
      const result = await coordinateHelpers.validate('1,1; 2,2; 3,1; 999,999')
      expect(result).to.be.true
    })

    it('should resolve true for a valid set of coordinates', async () => {
      const result = await coordinateHelpers.validate('1,1; 2,2; 3,1; 999,999')
      expect(result).to.be.true
    })

    it('should resolve true for an empty set of coordinates', async () => {
      const result = await coordinateHelpers.validate('')
      const result2 = await coordinateHelpers.validate('   ')
      expect(result).to.be.true
      expect(result2).to.be.true
    })

    it('should reject for an invalid set of coordinates', async () => {
      expect(coordinateHelpers.validate('1,1;1,2')).to.be['rejectedWith']('Invalid coordinate 1,1;1,2')
      expect(coordinateHelpers.validate('1,')).to.be['rejectedWith']('Invalid coordinate 1,')
      expect(coordinateHelpers.validate('9999')).to.be['rejectedWith']('Invalid coordinate 9999')
      expect(coordinateHelpers.validate('9,9,9,9')).to.be['rejectedWith']('Invalid coordinate 9,9,9,9')
      expect(coordinateHelpers.validate('`1,1')).to.be['rejectedWith']('Invalid coordinate `1,1')
      expect(coordinateHelpers.validate(' 1,1')).to.be['rejectedWith']('Invalid coordinate  1,1')
      expect(coordinateHelpers.validate('asd')).to.be['rejectedWith']('Invalid coordinate asd')
      expect(coordinateHelpers.validate('Infinity,-Infinity')).to.be['rejectedWith']('Invalid coordinate Infinity,-Infinity')
      expect(coordinateHelpers.validate('0,NaN')).to.be['rejectedWith']('Invalid coordinate 0,NaN')
    })
  })

  describe('parse', () => {
    it('should parse a single valid coordinate', () => {
      const result = coordinateHelpers.parse('1,1')
      expect(result).to.deep.equal(['1,1'])
    })

    it('should parse a set of valid coordinates', () => {
      const result = coordinateHelpers.parse('1,1; 2,2; 99,99')
      expect(result).to.deep.equal(['1,1', '2,2', '99,99'])
    })

    it('should parse a single coordinate with extra spaces', () => {
      expect(coordinateHelpers.parse(' 1,1  ')).to.deep.equal(['1,1'])
      expect(coordinateHelpers.parse('  1,1')).to.deep.equal(['1,1'])
      expect(coordinateHelpers.parse('1,1  ')).to.deep.equal(['1,1'])
    })

    it('should parse a set of coordinates with extra spaces', () => {
      expect(coordinateHelpers.parse(' 1,1; 1,2; 1,3')).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(coordinateHelpers.parse('1,1; 1,2; 1,3 ')).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(coordinateHelpers.parse('    1,1; 1,2; 1,3    ')).to.deep.equal(['1,1', '1,2', '1,3'])
    })

    it('should parse a single coordinate with leading zeroes', () => {
      expect(coordinateHelpers.parse('01,01')).to.deep.equal(['1,1'])
      expect(coordinateHelpers.parse('010,0001')).to.deep.equal(['10,1'])
      expect(coordinateHelpers.parse('0001,010')).to.deep.equal(['1,10'])
      expect(coordinateHelpers.parse('0000,000')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parse('  0001,010  ')).to.deep.equal(['1,10'])
    })

    it('should parse set of coordinates with leading zeroes', () => {
      expect(coordinateHelpers.parse('01,01; 01,01')).to.deep.equal(['1,1', '1,1'])
      expect(coordinateHelpers.parse('099,0001; 01,1; 11,1')).to.deep.equal(['99,1', '1,1', '11,1'])
      expect(coordinateHelpers.parse('1,1; 0001,010')).to.deep.equal(['1,1', '1,10'])
      expect(coordinateHelpers.parse('    1,1;   0001,0999  ')).to.deep.equal(['1,1', '1,999'])
    })

    it('should parse a single coordinate with negative zeroes', () => {
      expect(coordinateHelpers.parse('-01,-01')).to.deep.equal(['-1,-1'])
      expect(coordinateHelpers.parse('-010,-0001')).to.deep.equal(['-10,-1'])
      expect(coordinateHelpers.parse('-0,-0001')).to.deep.equal(['0,-1'])
      expect(coordinateHelpers.parse(' -0,-0  ')).to.deep.equal(['0,0'])
    })

    it('should parse set of coordinates with negative zeroes', () => {
      expect(coordinateHelpers.parse('-01,01; 01,-01')).to.deep.equal(['-1,1', '1,-1'])
      expect(coordinateHelpers.parse('-010,-0001; 01,1; 11,1')).to.deep.equal(['-10,-1', '1,1', '11,1'])
      expect(coordinateHelpers.parse('1,1; -0001,010')).to.deep.equal(['1,1', '-1,10'])
      expect(coordinateHelpers.parse('    1,1;   0001,-010  ')).to.deep.equal(['1,1', '1,-10'])
      expect(coordinateHelpers.parse(' 000,-000;   000,-0  ')).to.deep.equal(['0,0', '0,0'])
    })

    it('should fail to parse invalid coordinates', () => {
      expect(coordinateHelpers.parse('NaN')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parse('asd')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parse('NaN,NaN')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parse('Infinity,Infinity')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parse('-NaN,-Infinity')).to.deep.equal(['0,0'])
      expect(coordinateHelpers.parse('NaN,1; NaN,-0; -Infinity,Infinity; asd')).to.deep.equal(['0,1', '0,0', '0,0', '0,0'])
    })
  })

  describe('getObject', () => {
    it('should return a single valid coordinate as an object', () => {
      const result = coordinateHelpers.getObject('1,1')
      expect(result).to.deep.equal({ x: 1, y: 1 })
    })
    it('should return a single invalid coordinate as an object', () => {
      const result = coordinateHelpers.getObject('asd,asd')
      expect(result).to.deep.equal({ x: 0, y: 0 })
    })
  })

  describe('isValid', () => {
    it('should return true for a single valid coordinate', () => {
      const result = coordinateHelpers.isValid('1,1')
      expect(result).to.be.true
    })
    it('should return false for a single invalid coordinate', () => {
      const result = coordinateHelpers.getObject('asd,asd')
      expect(result).to.deep.equal(false)
    })
  })
})
