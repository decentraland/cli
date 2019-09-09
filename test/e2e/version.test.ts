import * as path from 'path'
import test from 'ava'

import { isDebug } from '../../src/utils/env'
import Commando from '../helpers/commando'

test('E2E - version command', async t => {
  const { version } = require('../../package.json')
  const dclVersion: string = await new Promise(resolve => {
    let allData = ''
    new Commando(
      `node ${path.resolve('dist', 'cli.js')} version`,
      {
        silent: !isDebug(),
        workingDir: '.',
        env: { NODE_ENV: 'development' }
      },
      data => (allData += data)
    ).on('end', async () => {
      resolve(allData)
    })
  })

  t.true(dclVersion.includes(version))
})
