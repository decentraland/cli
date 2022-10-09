#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

import { main } from './main'

fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8', (err, data) => {
  if (err) {
    console.error('There was an unexpected error.', err)
    process.exit(1)
  }

  const { version } = JSON.parse(data)
  main(version).catch((err: any) => {
    console.error(err)
    process.exit(1)
  })
})
