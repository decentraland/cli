import test from 'ava'

import { Ethereum } from '../../../src/lib/Ethereum'

test('Unit - Ethereum.decodeLandData()', (t) => {
  const eth = new Ethereum()

  t.deepEqual(
    eth['decodeLandData'](
      '0,"myLand","my description","QmYeRMVLAtHCzGUbFSBbTTSUYx4AnqHZWwXAy5jzVJSpCE"'
    ),
    {
      version: 0,
      name: 'myLand',
      description: 'my description'
    }
  )

  t.deepEqual(eth['decodeLandData']('0,"myLand","my description",'), {
    version: 0,
    name: 'myLand',
    description: 'my description'
  })

  t.deepEqual(eth['decodeLandData']('0,,,'), {
    version: 0,
    name: null,
    description: null
  })

  t.deepEqual(
    eth['decodeLandData'](
      '0,"",,"QmYeRMVLAtHCzGUbFSBbTTSUYx4AnqHZWwXAy5jzVJSpCE"'
    ),
    {
      version: 0,
      name: null,
      description: null
    }
  )
})
