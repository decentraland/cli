import path from 'path'
import test from 'ava'

import { isDebug } from '../../src/utils/env'
import Commando from '../helpers/commando'
import { version } from '../../package.json'

test('E2E - version command', async (t) => {
  const dclVersion: string = await new Promise((resolve) => {
    let allData = ''
    new Commando(
      `node ${path.resolve('dist', 'cli.js')} version`,
      {
        silent: !isDebug(),
        workingDir: '.',
        env: { NODE_ENV: 'development' }
      },
      (data) => (allData += data)
    ).on('end', async () => {
      resolve(allData)
    })
  })

  t.true(dclVersion.includes(version))
})
