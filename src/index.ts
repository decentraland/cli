import vorpal = require('vorpal');

vorpal
  .command('foo', 'Outputs "bar".')
  .action(function(args : string, callback : any) {
    this.log('bar');
    callback();
  });

vorpal
  .delimiter('myapp$')
  .show();
