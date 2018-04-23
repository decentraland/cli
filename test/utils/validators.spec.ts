import { expect, use } from 'chai'
const chaiAsPromised = require('chai-as-promised')
import * as fs from 'fs-extra'
import * as validations from '../../src/utils/validators'

use(chaiAsPromised)

describe('validations util', () => {
  describe('validateCoordinates', () => {
    it('should resolve true for a single valid coordinate', async () => {
      const result = await validations.validateCoordinates('1,1')
      expect(result).to.be.true
    })

    it('should resolve true for a valid set of coordinates', async () => {
      const result = await validations.validateCoordinates('1,1; 2,2; 3,1; 999,999')
      expect(result).to.be.true
    })

    it('should resolve true for a valid set of coordinates', async () => {
      const result = await validations.validateCoordinates('1,1; 2,2; 3,1; 999,999')
      expect(result).to.be.true
    })

    it('should resolve true for an empty set of coordinates', async () => {
      const result = await validations.validateCoordinates('')
      const result2 = await validations.validateCoordinates('   ')
      expect(result).to.be.true
      expect(result2).to.be.true
    })

    it('should reject for an invalid set of coordinates', async () => {
      expect(validations.validateCoordinates('1,1;1,2')).to.be['rejectedWith']('Invalid coordinate 1,1;1,2')
      expect(validations.validateCoordinates('1,')).to.be['rejectedWith']('Invalid coordinate 1,')
      expect(validations.validateCoordinates('9999')).to.be['rejectedWith']('Invalid coordinate 9999')
      expect(validations.validateCoordinates('9,9,9,9')).to.be['rejectedWith']('Invalid coordinate 9,9,9,9')
      expect(validations.validateCoordinates('`1,1')).to.be['rejectedWith']('Invalid coordinate `1,1')
      expect(validations.validateCoordinates(' 1,1')).to.be['rejectedWith']('Invalid coordinate  1,1')
    })
  })
})
