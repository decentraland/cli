import { expect, use } from 'chai'
import * as fs from 'fs-extra'
import * as parsers from '../../src/utils/parsers'

describe('parsers util', () => {
  describe('parseCoordinates', () => {
    it('should parse a single valid coordinate', () => {
      const result = parsers.parseCoordinates('1,1')
      expect(result).to.deep.equal(['1,1'])
    })

    it('should parse a set of valid coordinates', () => {
      const result = parsers.parseCoordinates('1,1; 2,2; 99,99')
      expect(result).to.deep.equal(['1,1', '2,2', '99,99'])
    })

    it('should parse a single coordinate with extra spaces', () => {
      const result = parsers.parseCoordinates(' 1,1  ')
      const result2 = parsers.parseCoordinates('  1,1')
      const result3 = parsers.parseCoordinates('1,1  ')

      expect(result).to.deep.equal(['1,1'])
      expect(result2).to.deep.equal(['1,1'])
      expect(result3).to.deep.equal(['1,1'])
    })

    it('should parse a set of coordinates with extra spaces', () => {
      const result = parsers.parseCoordinates(' 1,1; 1,2; 1,3')
      const result2 = parsers.parseCoordinates('1,1; 1,2; 1,3 ')
      const result3 = parsers.parseCoordinates('    1,1; 1,2; 1,3    ')

      expect(result).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(result2).to.deep.equal(['1,1', '1,2', '1,3'])
      expect(result3).to.deep.equal(['1,1', '1,2', '1,3'])
    })

    it('should parse a single coordinate with leading zeroes', () => {
      const result = parsers.parseCoordinates('01,01')
      const result2 = parsers.parseCoordinates('010,0001')
      const result3 = parsers.parseCoordinates('0001,010')
      const result4 = parsers.parseCoordinates('0000,000')
      const result5 = parsers.parseCoordinates('  0001,010  ')

      expect(result).to.deep.equal(['1,1'])
      expect(result2).to.deep.equal(['10,1'])
      expect(result3).to.deep.equal(['1,10'])
      expect(result4).to.deep.equal(['0,0'])
      expect(result5).to.deep.equal(['1,10'])
    })

    it('should parse set of coordinates with leading zeroes', () => {
      const result = parsers.parseCoordinates('01,01; 01,01')
      const result2 = parsers.parseCoordinates('099,0001; 01,1; 11,1')
      const result3 = parsers.parseCoordinates('1,1; 0001,010')
      const result4 = parsers.parseCoordinates('    1,1;   0001,0999  ')

      expect(result).to.deep.equal(['1,1', '1,1'])
      expect(result2).to.deep.equal(['99,1', '1,1', '11,1'])
      expect(result3).to.deep.equal(['1,1', '1,10'])
      expect(result4).to.deep.equal(['1,1', '1,999'])
    })

    it('should parse a single coordinate with negative zeroes', () => {
      const result = parsers.parseCoordinates('-01,-01')
      const result2 = parsers.parseCoordinates('-010,-0001')
      const result3 = parsers.parseCoordinates('-0,-0001')
      const result4 = parsers.parseCoordinates(' -0,-0  ')

      expect(result).to.deep.equal(['-1,-1'])
      expect(result2).to.deep.equal(['-10,-1'])
      expect(result3).to.deep.equal(['0,-1'])
      expect(result4).to.deep.equal(['0,0'])
    })

    it('should parse set of coordinates with negative zeroes', () => {
      const result = parsers.parseCoordinates('-01,01; 01,-01')
      const result2 = parsers.parseCoordinates('-010,-0001; 01,1; 11,1')
      const result3 = parsers.parseCoordinates('1,1; -0001,010')
      const result4 = parsers.parseCoordinates('    1,1;   0001,-010  ')
      const result5 = parsers.parseCoordinates(' 000,-000;   000,-0  ')

      expect(result).to.deep.equal(['-1,1', '1,-1'])
      expect(result2).to.deep.equal(['-10,-1', '1,1', '11,1'])
      expect(result3).to.deep.equal(['1,1', '-1,10'])
      expect(result4).to.deep.equal(['1,1', '1,-10'])
      expect(result5).to.deep.equal(['0,0', '0,0'])
    })
  })
})
