import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';

export const pathExists = promisify(fs.pathExists);
export const writeFile = <(file: string, data: string) => void>promisify(fs.writeFile);
export const readFile = <(file: string, format?: string) => Promise<string>>promisify(fs.readFile);
export const mkdir = promisify(fs.mkdir);

export async function ensureFolder(path: string | Array<string>): Promise<void> {
  if (typeof path === 'string') {
    if (await pathExists(path)) {
      return;
    }
    await mkdir(path);
  }
  if (Array.isArray(path)) {
    if (path.length === 0) {
      return;
    } else if (path.length === 1) {
      return await ensureFolder(path[0]);
    } else {
      await ensureFolder(path[0]);
      await ensureFolder(path.slice(1));
    }
  }
}
