import chalk from "chalk";
const budo = require("budo");

export default function(args: any, vorpal: any, callback: () => void): void {
  vorpal.log(
    chalk.blue("Starting local development server for Decentraland scene...\n")
  );

  budo("./", {
    host: "0.0.0.0",
    live: true,
    port: 8080,
    stream: process.stdout
  });
}
