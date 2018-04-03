import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

import { getRoot } from '../utils/get-root';
import { cliPath } from '../utils/cli-path';
import { preview } from '../utils/analytics';

export function serve(vorpal: any, args: any): any {
  vorpal.log(chalk.blue('Preview server is starting...\n'));

  const root = getRoot();

  const app = express();
  preview();

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

  // first find the target path's node_modules/dcl-sdk
  let sdkFolder = path.resolve(process.cwd(), 'node_modules/dcl-sdk');

  // if it doesn't exist, use the bundled SDK
  if (!fs.existsSync(sdkFolder)) {
    sdkFolder = path.dirname(require.resolve('dcl-sdk'));
  }

  // serve the folder `${sdkFolder}/artifacts` as `/dcl-sdk`
  app.use('/dcl-sdk', express.static(path.resolve(sdkFolder, 'artifacts')));
  app.use(express.static(root));
  app.listen(2044, '0.0.0.0');
  return app;
}
