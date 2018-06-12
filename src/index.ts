/// <reference path="../typings/dcl.d.ts" />
import Vorpal = require('vorpal')
import { init as initCommand } from './commands/init'
import { link } from './commands/link'
import { start } from './commands/preview'
import { deploy } from './commands/deploy'
import { pin } from './commands/pin'

const pkg = require('../package.json')

export const VERSION = pkg.version
export const DELIMITER = 'dcl $'
export const vorpal = new Vorpal()

export function init(options = {}) {
  vorpal.use(initCommand)
  vorpal.use(start)
  vorpal.use(deploy)
  vorpal.use(pin)
  vorpal.use(link)

  vorpal
    .delimiter(DELIMITER)
    .catch('[words...]')
    .option('-v, --version', 'Prints the version of the CLI')
    .action(args => {
      if (args.options.version) {
        vorpal.log(`v${VERSION}`)
      }
    })

  if (process.argv.length > 2) {
    const exists = vorpal.commands.some((command: any) => command._name === process.argv[2])

    if (exists) {
      vorpal.parse(process.argv)
    } else {
      showHelp()
    }
  } else {
    showHelp()
  }
}

function showHelp() {
  vorpal.log(`\n  Decentraland CLI v${VERSION}`)
  vorpal.execSync('help')
}
