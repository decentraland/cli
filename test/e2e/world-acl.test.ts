import test from 'ava'
import * as worldAcl from '../../src/commands/world-acl'

test('snapshot - dcl help world-acl', (t) => {
  t.snapshot(worldAcl.help())
})
