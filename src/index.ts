/**
 * Decentraland CLI.
 *
 * Command line tool for parcel management.
 */

// Use custom vorpal type definitions until there's official one
/// <reference path="../typings/vorpal.d.ts" />
/// <reference path="../typings/dcl.d.ts" />

// Use custom docker names type definitions until there's official one
/// <reference path="../typings/docker-names.d.ts" />

/// <reference path="../typings/decentraland-commons.d.ts" />

import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import ProgressBar = require('progress');
import Vorpal = require('vorpal');
import { help } from './commands/help';
import { init } from './commands/init';
import { link } from './commands/link';
import { push } from './commands/push';
import { start } from './commands/start';
import { update } from './commands/update';
import { upload } from './commands/upload';
const pkg = require('../package.json');

/**
 * Export the current version.
 */
export const VERSION = pkg.version;

/**
 * CLI delimiter.
 */
export const DELIMITER = 'dcl $';

/**
 * CLI instance.
 */
export const vorpal = new Vorpal();

const cli = {
  vorpal,
  init(options = {}) {
    vorpal.use(init);
    vorpal.use(start);
    vorpal.use(upload);
    vorpal.use(link);
    vorpal.use(push);
    vorpal.use(help);
    // vorpal.use(update); TODO: implement auto-update

    vorpal
      .delimiter(DELIMITER)
      .catch('[words...]', 'Catches incorrect commands')
      .action(() => {
        vorpal.execSync('help');
      });

    if (process.argv.length > 2) {
      // If one or more command, execute and close
      vorpal.parse(process.argv);
    } else {
      // Show help if no commands are supplied
      vorpal.log(`Decentraland CLI v${VERSION}\n`);
      vorpal.exec('help');
    }
  }
};

module.exports = cli;
