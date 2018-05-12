/// <reference path="../typings/dcl.d.ts" />
/// <reference path="../typings/docker-names.d.ts" />

import Vorpal = require('vorpal')
import { help } from './commands/help'
import { init as initCommand } from './commands/init'
import { link } from './commands/link'
import { start } from './commands/preview'
import { upgrade } from './commands/upgrade'
import { deploy } from './commands/deploy'
import { pin } from './commands/pin'

const pkg = require('../package.json')

/**
 * Export the current version.
 */
export const VERSION = pkg.version

/**
 * CLI delimiter.
 */
export const DELIMITER = 'dcl $'

/**
 * CLI instance.
 */
export const vorpal = new Vorpal()

export function init(options = {}) {
  vorpal.use(initCommand)
  vorpal.use(start)
  vorpal.use(deploy)
  vorpal.use(pin)
  vorpal.use(link)
  vorpal.use(upgrade)
  vorpal.use(help)

  vorpal
    .delimiter(DELIMITER)
    .catch('[words...]', 'Catches incorrect commands')
    .action(() => {
      vorpal.execSync('help')
    })

  if (process.argv.length > 2) {
    // If one or more command, execute and close
    vorpal.parse(process.argv)
  } else {
    // Show help if no commands are supplied
    vorpal.log(`Decentraland CLI v${VERSION}\n`)
    vorpal.exec('help')
  }
}
