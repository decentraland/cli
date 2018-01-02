import vorpal = require("vorpal");

export const cli = vorpal();
export const DELIMITER = "dcl-cli$";
cli
  .command("init", 'Outputs "bar".')
  .action(function(args: string, callback: any) {
    this.log("bar");
    callback();
  });

cli.delimiter(DELIMITER).show();
