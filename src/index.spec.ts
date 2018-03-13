import { expect } from 'chai';
import 'mocha';
import { vorpal, DELIMITER } from './';

describe('Initialze CLI', () => {
  it('should set correct delimiter', () => {
    const delimiter = vorpal._delimiter;
    expect(delimiter).to.equal(DELIMITER);
  });
});
