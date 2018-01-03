import path = require('path');
import { exec } from 'child_process';

export default function(args: any): Promise<any> {
  return new Promise((resolve: any, reject: any) => {
    console.log('Starting local development server for Decentraland scene...');
    console.log(path.resolve('.'))
    console.log(args)
    // TODO: use different http server. Also don't use exec from child_process
    exec(`budo --host 0.0.0.0 --port 4444 --live --open`, (error, response) => {
      if (error) {
        return reject(error);
      }
      resolve(response);
    });
  });
}
