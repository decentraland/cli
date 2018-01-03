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
export const isDev = process.argv[1].indexOf("index") !== -1;

/**
 * CLI instance.
 */
export const cli = vorpal();

/**
 * `init` command for generating new Decentraland scene.
 */
cli
  .command("init")
  .description("Generates new Decentraland scene.")
  .option("-f, --force", "Force file overwrites.")
  .option(
    "-p, --path <path>",
    "Output path (default is the current working directory)."
  )
  .option("--with-sample", "Include sample scene.")
  .action(function(args: any, callback: () => void) {
    const self = this;
    self.log(args);

    const root = path.resolve(".");
    console.log(root);

    if (args.options["with-sample"]) {
      self.log(" Creating new project with sample scene...");
      // var bar = new ProgressBar(':bar :current/:total', { total: 50 });
      // var timer = setInterval(function () {
      //   bar.tick();
      //   if (bar.complete) {
      //     self.log('\ncomplete\n');
      //     clearInterval(timer);
      //   }
      // }, 100);
    } else {
      self.prompt(
        {
          type: "input",
          name: "sampleScene",
          message: `${chalk.yellow(
            " Do you want to create new project with sample scene? "
          )} ${chalk.red("(y/n) ")}`
        },
        (data: any) => {
          self.log(data);
          if (data.sampleScene === "y") {
            self.log(" Creating new project with sample scene...");
          }

          if (data.sampleScene === "n") {
            self.log(" Creating new project with sample scene...");
          }

          if (data.sampleScene === "") {
            // do nothing
          }

          self.log(" Invalid argument.");
          callback();
        }
      );
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

cli.delimiter(DELIMITER); // .show();

// If one or more command, execute and close
if (process.argv.length > 2) {
  cli.parse(process.argv);
} else {
  // Enters immersive mode if no commands supplied
  cli.log(`DCL CLI v${VERSION}\n`);
  cli.log("Welcome to the Decentraland command line tool!");
  cli.log('Type "exit" to quit, "help" for a list of commands.\n');
}
