import test from 'ava'
import * as exportCmd from '../../src/commands/export'

test('snapshot - dcl help export', (t) => {
  t.snapshot(exportCmd.help())
})
