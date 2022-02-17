import test from 'ava'

import { help } from '../../src/commands/workspace'

test('snapshot - dcl help instal', (t) => {
  t.snapshot(help())
})
