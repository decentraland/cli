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

import chalk from 'chalk';
import fs = require('fs-extra');
import path = require('path');
import ProgressBar = require('progress');
import Vorpal = require('vorpal');
import { help } from './commands/help';
import { init } from './commands/init';
import { link } from './commands/link';
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
    vorpal.use(help);
    // vorpal.use(update); TODO: implement auto-update

    vorpal
      .delimiter(DELIMITER)
      .show();

    // If one or more command, execute and close
    if (process.argv.length > 2) {
      vorpal.parse(process.argv);
    } else {
      // Enters immersive mode if no commands supplied
      vorpal.log(`Decentraland CLI v${VERSION}\n`);
      vorpal.log('Type "exit" to quit, "help" for a list of commands.\n');
    }
  }
};

module.exports = cli;
