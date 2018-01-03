/**
 * Decentraland CLI.
 *
 * Command line tool for parcel management.
 */

// Use custom vorpal type definitions until there's official one
/// <reference path="../typings/vorpal.d.ts" />

import chalk from "chalk";
import fs = require("fs");
import path = require("path");
import ProgressBar = require("progress");
import vorpal = require("vorpal");
import mkdirp = require('mkdirp');
import start from "./utils/start-server";
const pkg = require("../package.json");

/**
 * Export the current version.
 */
export const VERSION = pkg.version;

/**
 * CLI delimiter.
 */
export const DELIMITER = "dcl-cli$";

/**
 * Check if CLI is used in development mode.
 */
export const isDev = process.argv[1].indexOf("index") !== -1 || process.argv[1].indexOf("dev") !== -1;

/**
 * CLI instance.
 */
const cli = vorpal();

/**
 * `init` command for generating new Decentraland scene.
 */
cli
  .command("init [name]")
  .description("Generates new Decentraland scene.")
  .option("-f, --force", "Force file overwrites.")
  .option(
    "-p, --path <path>",
    "Output path (default is the current working directory)."
  )
  .option("--with-sample", "Include sample scene.")
  .action(function(args: any, callback: () => void) {
    const self = this;
    const dirName = isDev ? `tmp/${args.options.path}/${args.name}` : `${args.options.path}/${args.name}`

    function createDirFromTemplate(path: string): void {
      mkdirp(path, (err) => {
        if (err) self.log(err.message)
        else self.log(`New project created in '${path}' directory.`)
      });
    }

    const questions = []
    if (!args.options.force && fs.existsSync(path.resolve(dirName))) {
      questions.push({
        type: "confirm",
        name: "continue",
        default: false,
        message: chalk.yellow("Folder already exists. Overwrite its contents?")
      })
    }
    if (!args.options["with-sample"]) {
      questions.push({
        type: "confirm",
        name: "sampleScene",
        default: false,
        message: chalk.yellow("Do you want to create new project with sample scene?")
      })
    }

    if (questions.length > 0) {
      self.prompt(questions)
        .then((results: any) => {
          // self.log(results)
          // self.log("!!results.continue: ", !results.continue)
          // self.log("!!results.sampleScene: ", !!results.sampleScene)
          // Folder already exists, but don't overwrite
          if (!!results.continue) {
            self.log("stop")
            callback()
          }

          self.log("continue")

          // Without sample scene
          if (!!results.sampleScene) {
            createDirFromTemplate(dirName)
          } else {
            // TODO: create project from template WITH sample scene
            self.log("[not yet implemented] create project from template WITH sample scene")
            callback()
          }
        })
    } else {
      // TODO: create project from template WITH sample scene
      self.log("[not yet implemented] create project from template WITH sample scene")
      callback()
    }
  });

/**
 * `start` command for starting local development server.
 */
cli
  .command("start")
  .alias("run")
  .description("Starts local development server.")
  .action(function(args: string, callback: () => void) {
    const self = this;
    start
      .bind(cli)(args)
      .then((response: any) => {
        self.log(chalk.green(response));
      })
      .catch((error: Error) => {
        if (error) {
          self.log(
            chalk.red("There was a problem starting local development server.")
          );
          self.log(error.message);
        }
      });
    callback();
  });

/**
 * `upload` command for uploading scene to IPFS.
 */
cli
  .command("upload")
  .description("Uploads scene to IPFS.")
  .action(function(args: string, callback: () => void) {
    this.log("upload");
    callback();
  });

cli.delimiter(DELIMITER).show();

// If one or more command, execute and close
if (process.argv.length > 2) {
  cli.parse(process.argv);
} else {
  // Enters immersive mode if no commands supplied
  cli.log(`DCL CLI v${VERSION}\n`);
  cli.log("Welcome to the Decentraland command line tool!");
  cli.log('Type "exit" to quit, "help" for a list of commands.\n');
}

module.exports = cli
