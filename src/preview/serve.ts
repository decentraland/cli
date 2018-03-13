import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

import { getRoot } from '../utils/get-root';
import { cliPath } from '../utils/cli-path';
import { preview } from '../utils/analytics';

export function serve(vorpal: any, args: any, ): any {
  vorpal.log(chalk.blue('Parcel server is starting...\n'));

  const root = getRoot();
  const reloadify = require('reloadify')(root);

  const app = express();
  preview();

  app.get('/parcelInfo.json', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(`{"parcels": {"0,0": "0,,,/"}}`);
  });
  app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
  <html>
        <head>
              <title>Decentraland Preview</title>
              <script charset="utf-8" src="/static/preview.js"></script>
              <script charset="utf-8" src="/static/parcel-boundary.js"></script>
            </head>
        <body>
        </body>
  </html>`
    );
  });
  app.use('/static', express.static(path.join(cliPath, 'static')));
  app.use(express.static(root));
  app.use(reloadify);
  app.listen(2044, '0.0.0.0');
  return app;
}
