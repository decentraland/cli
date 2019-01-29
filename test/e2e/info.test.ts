import * as path from 'path'
import test from 'ava'

import * as info from '../../src/commands/info'
import { isDebug } from '../../src/utils/env'
import Commando, { Response } from '../helpers/commando'

test('snapshot - dcl help info', t => {
  t.snapshot(info.help())
})

test('E2E - info command', async t => {
  await new Promise(resolve => {
    let allData = ''
    new Commando(
      `node ${path.resolve('bin', 'dcl')} info --network ropsten -35,-130`,
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
