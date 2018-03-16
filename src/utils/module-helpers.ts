import fs = require('fs-extra');
import { spawn } from 'child_process';

export const npm = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

export function installDependencies(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['install']);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('close', () => resolve());
  });
}

export function buildTypescript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', 'build']);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('close', () => resolve());
  });
}
