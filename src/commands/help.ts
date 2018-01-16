

export function help(vorpal: any) {
  function showHelp(commandName: string) {
    commandName = commandName.toLowerCase().trim();

    const command = vorpal.commands.find(
      (command: any) => command._name === commandName
    );

    if (command && !command._hidden) {
      if (typeof command._help === 'function') {
        command._help(commandName, (str: string) =>
          vorpal.log(str)
        );
      } else {
        vorpal.log(command.helpInformation());
      }
    }
  }

  const help = vorpal.find('help');
  if (help) {
    help.remove();
  }

  vorpal
    .command('help [command...]')
    .description('Provides help for a given command.')
    .action(function(args: any, callback: () => void) {
      if (args.command) {
        showHelp(args.command.join(' '));
      } else {
        // vorpal doesn't have a nice way to customize the full help list.
        // It uses a somewhat internal `_commandHelp` ( https://github.com/dthree/vorpal/blob/master/lib/vorpal.js#L1079 ) which is huge and not abstracted.
        // To avoid having to rewrite so much logic, we'll trick vorpal to do what we need.
        // Keep in mind that `_commandHelp` can change so, future mantainer, if this breaks and vorpal is on a version higher than 1.12.0
        // this is probably the culprit
        const oldCommands = vorpal.commands;
        const fullCommands = ['init', 'start', 'upload', 'link', 'help'];

        vorpal.commands = fullCommands.map((commandName: string) =>
          oldCommands.find((command: any) => command._name === commandName)
        );

        this.log(vorpal._commandHelp());

        vorpal.commands = oldCommands;
      }

      callback();
    });
};
