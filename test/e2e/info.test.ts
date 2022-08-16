import path from 'path'
import test from 'ava'

import * as info from '../../src/commands/info'
import { isDebug } from '../../src/utils/env'
import Commando from '../helpers/commando'

test('snapshot - dcl help info', (t) => {
  t.snapshot(info.help())
})

test('E2E - info command', async (t) => {
  await new Promise<void>((resolve) => {
    let allData = ''
    new Commando(
      `node ${path.resolve('dist', 'index.js')} info --network goerli -35,-130`,
      {
        silent: !isDebug(),
        workingDir: '.',
        env: { NODE_ENV: 'development' }
      },
      (data) => (allData += data)
    ).on('end', async () => {
      t.snapshot(allData)
      resolve()
    })
  })
})
