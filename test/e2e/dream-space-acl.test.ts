import test from 'ava'
import * as dreamSpaceAcl from '../../src/commands/dream-space-acl'

test('snapshot - dcl help dream-space-acl', (t) => {
  t.snapshot(dreamSpaceAcl.help())
})
