import fs = require('fs-extra');
import child = require('child_process');

export function installDependencies(): Promise<void> {
  const files = fs.readdirSync(process.cwd());

  return new Promise((resolve, reject) => {
    if (files.find(file => file === 'package.json')) {
      child.exec('npm i', (err, stdout, stderr) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
    }
  });
}

export function buildTypescript(): Promise<void> {
  const files = fs.readdirSync(process.cwd());

  return new Promise((resolve, reject) => {
    if (files.find(file => file === 'tsconfig.json')) {
      child.exec('npm run build', (err) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
    }
  });
}