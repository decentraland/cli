import test from 'ava'

import * as coordinateHelpers from '../../../src/utils/coordinateHelpers'

test('Unit - coordinateHelpers.validate() - should resolve true for a single valid coordinate', async (t) => {
  const result = await coordinateHelpers.validate('1,1')
  t.true(result)
})

test('Unit - coordinateHelpers.validate() - should resolve true for a more that one valid set of coordinates', async (t) => {
  const result = await coordinateHelpers.validate('1,1; 2,2; 3,1; 999,999')
  t.true(result)
})

test('Unit - coordinateHelpers.validate() - should resolve true for a valid set of coordinates', async (t) => {
  const result = await coordinateHelpers.validate('1,1; 2,2; 3,1; 999,999')
  t.true(result)
})

test('Unit - coordinateHelpers.validate() - should resolve true for an empty set of coordinates', async (t) => {
  const result = await coordinateHelpers.validate('')
  const result2 = await coordinateHelpers.validate('   ')
  t.true(result)
  t.true(result2)
})

test('Unit - coordinateHelpers.validate() - should reject for an invalid set of coordinates', async (t) => {
  await t.throwsAsync(coordinateHelpers.validate('1,1;1,2'), {
    message: 'Invalid coordinate 1,1;1,2'
  })
  await t.throwsAsync(coordinateHelpers.validate('1,'), {
    message: 'Invalid coordinate 1,'
  })
  await t.throwsAsync(coordinateHelpers.validate('9999'), {
    message: 'Invalid coordinate 9999'
  })
  await t.throwsAsync(coordinateHelpers.validate('9,9,9,9'), {
    message: 'Invalid coordinate 9,9,9,9'
  })
  await t.throwsAsync(coordinateHelpers.validate('`1,1'), {
    message: 'Invalid coordinate `1,1'
  })
  await t.throwsAsync(coordinateHelpers.validate(' 1,1'), {
    message: 'Invalid coordinate  1,1'
  })
  await t.throwsAsync(coordinateHelpers.validate('asd'), {
    message: 'Invalid coordinate asd'
  })
  await t.throwsAsync(coordinateHelpers.validate('Infinity,-Infinity'), {
    message: 'Invalid coordinate Infinity,-Infinity'
  })
  await t.throwsAsync(coordinateHelpers.validate('0,NaN'), {
    message: 'Invalid coordinate 0,NaN'
  })
})

test('Unit - coordinateHelpers.parse() - should parse a single valid coordinate', (t) => {
  const result = coordinateHelpers.parse('1,1')
  t.deepEqual(result, ['1,1'])
})

test('Unit - coordinateHelpers.parse() - should parse a set of valid coordinates', (t) => {
  const result = coordinateHelpers.parse('1,1; 2,2; 99,99')
  t.deepEqual(result, ['1,1', '2,2', '99,99'])
})

test('Unit - coordinateHelpers.parse() - should parse a single coordinate with extra spaces', (t) => {
  t.deepEqual(coordinateHelpers.parse(' 1,1  '), ['1,1'])
  t.deepEqual(coordinateHelpers.parse('  1,1'), ['1,1'])
  t.deepEqual(coordinateHelpers.parse('1,1  '), ['1,1'])
})

test('Unit - coordinateHelpers.parse() - should parse a set of coordinates with extra spaces', (t) => {
  t.deepEqual(coordinateHelpers.parse(' 1,1; 1,2; 1,3'), ['1,1', '1,2', '1,3'])
  t.deepEqual(coordinateHelpers.parse('1,1; 1,2; 1,3 '), ['1,1', '1,2', '1,3'])
  t.deepEqual(coordinateHelpers.parse('    1,1; 1,2; 1,3    '), ['1,1', '1,2', '1,3'])
})

test('Unit - coordinateHelpers.parse() - should parse a single coordinate with leading zeroes', (t) => {
  t.deepEqual(coordinateHelpers.parse('01,01'), ['1,1'])
  t.deepEqual(coordinateHelpers.parse('010,0001'), ['10,1'])
  t.deepEqual(coordinateHelpers.parse('0001,010'), ['1,10'])
  t.deepEqual(coordinateHelpers.parse('0000,000'), ['0,0'])
  t.deepEqual(coordinateHelpers.parse('  0001,010  '), ['1,10'])
})

test('Unit - coordinateHelpers.parse() - should parse set of coordinates with leading zeroes', (t) => {
  t.deepEqual(coordinateHelpers.parse('01,01; 01,01'), ['1,1', '1,1'])
  t.deepEqual(coordinateHelpers.parse('099,0001; 01,1; 11,1'), ['99,1', '1,1', '11,1'])
  t.deepEqual(coordinateHelpers.parse('1,1; 0001,010'), ['1,1', '1,10'])
  t.deepEqual(coordinateHelpers.parse('    1,1;   0001,0999  '), ['1,1', '1,999'])
})

test('Unit - coordinateHelpers.parse() - should parse a single coordinate with negative zeroes', (t) => {
  t.deepEqual(coordinateHelpers.parse('-01,-01'), ['-1,-1'])
  t.deepEqual(coordinateHelpers.parse('-010,-0001'), ['-10,-1'])
  t.deepEqual(coordinateHelpers.parse('-0,-0001'), ['0,-1'])
  t.deepEqual(coordinateHelpers.parse(' -0,-0  '), ['0,0'])
})

test('Unit - coordinateHelpers.parse() - should parse set of coordinates with negative zeroes', (t) => {
  t.deepEqual(coordinateHelpers.parse('-01,01; 01,-01'), ['-1,1', '1,-1'])
  t.deepEqual(coordinateHelpers.parse('-010,-0001; 01,1; 11,1'), ['-10,-1', '1,1', '11,1'])
  t.deepEqual(coordinateHelpers.parse('1,1; -0001,010'), ['1,1', '-1,10'])
  t.deepEqual(coordinateHelpers.parse('    1,1;   0001,-010  '), ['1,1', '1,-10'])
  t.deepEqual(coordinateHelpers.parse(' 000,-000;   000,-0  '), ['0,0', '0,0'])
})

test('Unit - coordinateHelpers.parse() - should fail to parse invalid coordinates', (t) => {
  t.deepEqual(coordinateHelpers.parse('NaN'), ['0,0'])
  t.deepEqual(coordinateHelpers.parse('asd'), ['0,0'])
  t.deepEqual(coordinateHelpers.parse('NaN,NaN'), ['0,0'])
  t.deepEqual(coordinateHelpers.parse('Infinity,Infinity'), ['0,0'])
  t.deepEqual(coordinateHelpers.parse('-NaN,-Infinity'), ['0,0'])
  t.deepEqual(coordinateHelpers.parse('NaN,1; NaN,-0; -Infinity,Infinity; asd'), ['0,1', '0,0', '0,0', '0,0'])
})

test('Unit - coordinateHelpers.getObject() - should return a single valid coordinate as an object', (t) => {
  const result = coordinateHelpers.getObject('1,1')
  t.deepEqual(result, { x: 1, y: 1 })
})
test('Unit - coordinateHelpers.getObject() - should return a single invalid coordinate as an object', (t) => {
  const result = coordinateHelpers.getObject('asd,asd')
  t.deepEqual(result, { x: 0, y: 0 })
})

test('Unit - coordinateHelpers.isValid() - should return true for a single valid coordinate', (t) => {
  const result = coordinateHelpers.isValid('1,1')
  t.true(result)
})
test('Unit - coordinateHelpers.isValid() - should return false for a single invalid coordinate', (t) => {
  const result = coordinateHelpers.isValid('asd,asd')
  t.false(result)
})

test('Unit - coordinateHelpers.inBounds() - should return true for in bounds coordinates', (t) => {
  const result = coordinateHelpers.inBounds(-34, 57)
  t.true(result)
})
test('Unit - coordinateHelpers.inBounds() - should return false for out bounds coordinates', (t) => {
  const result = coordinateHelpers.inBounds(-1000, 300)
  t.false(result)
})

test('Unit - coordinateHelpers.isEqual() - should return true for equal coordinates', (t) => {
  const result = coordinateHelpers.isEqual({ x: 1, y: 2 }, { x: 1, y: 2 })
  t.true(result)
})
test('Unit - coordinateHelpers.isEqual() - should return false for not equal coordinates', (t) => {
  const result = coordinateHelpers.isEqual({ x: 1, y: 2 }, { x: 1, y: 5 })
  t.false(result)
})

test('Unit - coordinateHelpers.areConnected() - should return true for connected parcels', (t) => {
  const result = coordinateHelpers.areConnected([
    { x: 1, y: 2 },
    { x: 1, y: 3 }
  ])
  t.true(result)
})
test('Unit - coordinateHelpers.areConnected() - should return false for not connected parcels', (t) => {
  const result = coordinateHelpers.areConnected([
    { x: 1, y: 2 },
    { x: 1, y: 5 }
  ])
  t.false(result)
})
test('Unit - coordinateHelpers.areConnected() - should return true for one parcel.', (t) => {
  const result = coordinateHelpers.areConnected([{ x: 1, y: 2 }])
  t.true(result)
})
test('Unit - coordinateHelpers.areConnected() - should return false for connected parcels but not all of them', (t) => {
  const result = coordinateHelpers.areConnected([
    { x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 1, y: 5 },
    { x: 1, y: 6 }
  ])
  t.false(result)
})
