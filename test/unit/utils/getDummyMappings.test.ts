import test from 'ava'

import getDummyMappings from '../../../src/utils/getDummyMappings'

test('Unit - getDummyMappings() - should calculate mappings for outside of DCL', async t => {
  const expected = {
    mappings: {
      'bin/game.js': 'bin/game.js',
      'scene.json': 'scene.json'
    },
    contents: {
      'bin/game.js': 'bin/game.js',
      'scene.json': 'scene.json'
    },
    parcel_id: '0,0',
    publisher: '0x0000000000000000000000000000000000000000',
    root_cid: 'Qm0000000000000000000000000000000000000000'
  }

  const mappings = await getDummyMappings(['scene.json', 'bin/game.js'])
  t.deepEqual(mappings, expected)
})
