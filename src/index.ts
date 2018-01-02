/// <reference path="../types/vorpal.d.ts" />
import vorpal = require("vorpal");
import chalk from "chalk"
import fs = require('fs');
import pkg = require('../package.json');

/**
 * Export the current version.
 */
export const VERSION = pkg.version

/**
 * CLI delimiter.
 */
export const DELIMITER = "dcl-cli$";

/**
 * Check if CLI is used in development mode.
 */
export const isDev = process.argv[1].indexOf('index') !== -1

/**
 * CLI instance.
 */
export const cli = vorpal();

/**
 * `init` command for generating new Decentraland scene.
 */
cli
  .command("init")
  .description('Generates new Decentraland scene.')
  .option('--with-sample', 'Include sample scene.')
  .action(function(args: string, callback: any) {
    const self = this
    self.log('');
    return self.prompt({
      type: 'input',
      name: 'sampleScene',
      message: `${chalk.yellow(' Do you want to create new project with sample scene? ')} ${chalk.red('(y/n) ')}`
    }, function (data: any) {
      if (data.sampleScene === 'y') {
        self.log(' yes')
        self.log(' Great! Try out your connection.');
      }

      if (data.sampleScene === 'n') {
        self.log('no')
      }

      self.log(' Invalid argument.');
    });
  });

/**
 * `start` command for starting local development server.
 */
cli
  .command("start")
  .description('Starts local development server.')
  .action(function(args: string, callback: any) {
    this.log('start')
    callback()
  });

/**
 * `upload` command for uploading scene to IPFS.
 */
cli
  .command("upload")
  .description('Uploads scene to IPFS.')
  .action(function(args: string, callback: any) {
    this.log('upload')
    callback()
  });

cli.delimiter(DELIMITER).show();

// If one or more command, execute and close
if (process.argv.length > 2) {
  cli.parse(process.argv);
} else {
  // Enters immersive mode if no commands supplied
  cli.log(`DCL CLI v${VERSION}\n`);
  cli.log('Welcome to the Decentraland command line tool!');
  cli.log('Type "exit" to quit, "help" for a list of commands.\n');
}
