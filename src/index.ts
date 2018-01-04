/**
 * Decentraland CLI.
 *
 * Command line tool for parcel management.
 */

// Use custom vorpal type definitions until there's official one
/// <reference path="../typings/vorpal.d.ts" />

import chalk from "chalk";
import fs = require("fs-extra");
import path = require("path");
import ProgressBar = require("progress");
import vorpal = require("vorpal");
import start from "./utils/start-server";
import generateHtml from "./utils/generate-html";
import { dirname } from "path";
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
  .option(
    "-p, --path <path>",
    "Output path (default is the current working directory)."
  )
  .option("--with-sample", "Include sample scene.")
  .action(async function(args: any, callback: () => void) {
    const self = this;
    const path = args.options.path ? `${args.options.path}/${args.name}` : args.name
    const dirName = isDev ? `tmp/${path}` : `${path}`

    fs.ensureDirSync(`${dirName}/audio`)
    fs.ensureDirSync(`${dirName}/gltf`)
    fs.ensureDirSync(`${dirName}/obj`)
    fs.ensureDirSync(`${dirName}/scripts`)
    fs.ensureDirSync(`${dirName}/textures`)
    self.log(`New project created in '${dirName}' directory.`)

    function createScene(path: string, html: string, withSampleScene?: boolean): void {
      fs.outputFile(`${path}/scene.html`, html)
        .then(() => {
          if (withSampleScene) {
            self.log(`Sample scene was placed into ${chalk.green("scene.html")}.`)
          }
        })
        .catch((err: Error) => {
          self.log(err.message)
        })
    }

    if (args.options["with-sample"]) {
      const html = generateHtml({withSampleScene: true})
      createScene(dirName, html, true)
    } else {
      await self.prompt({
        type: "confirm",
        name: "sampleScene",
        default: false,
        message: chalk.yellow("Do you want to create new project with sample scene?")
      }).then((results: any) => {
        self.log(results)
        if (!results.sampleScene) {
          const html = generateHtml({withSampleScene: false})
          createScene(dirName, html, false)
        } else {
          const html = generateHtml({withSampleScene: true})
          createScene(dirName, html, true)
        }
      })
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
