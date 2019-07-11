import * as path from 'path'
import test from 'ava'

import * as ping from '../../src/commands/ping'
import { isDebug } from '../../src/utils/env'
import Commando from '../helpers/commando'

test('snapshot - dcl help ping', t => {
  t.snapshot(ping.help())
})

test('E2E - ping command', async t => {
  await new Promise(resolve => {
    let allData = ''
    new Commando(
      `node ${path.resolve('bin', 'dcl')} ping --network ropsten -35,-130`,
      {
        silent: !isDebug(),
        workingDir: '.',
        env: { NODE_ENV: 'development' }
      },
      data => (allData += data)
    ).on('end', async () => {
      t.snapshot(allData)
      resolve()
    })
  })
})
