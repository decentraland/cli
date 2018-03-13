import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

import { getRoot } from '../utils/get-root';
import { cliPath } from '../utils/cli-path';

export function serve(vorpal: any, args: any): any {
  vorpal.log(chalk.blue('Parcel server is starting...\n'));

  const root = getRoot();

  const app = express();

  app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Decentraland Preview</title>
          <script charset="utf-8" src="/dcl-sdk/preview.js"></script>
        </head>
        <body>
        </body>
      </html>
    `);
  });

  // serve the folder `dcl-sdk/artifacts` as `/dcl-sdk`
  app.use('/dcl-sdk', express.static(path.dirname(require.resolve('dcl-sdk/artifacts/preview'))));
  app.use(express.static(root));
  app.listen(2044, '0.0.0.0');
  return app;
}
