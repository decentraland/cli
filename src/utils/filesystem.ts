import * as fs from 'fs-extra'

/**
 * Checks if a folder exists and creates it if necessary.
 * @param path One or multiple paths to be checked.
 */
export async function ensureFolder(path: string | Array<string>): Promise<void> {
  if (typeof path === 'string') {
    if (await fs.pathExists(path)) {
      return
    }
    await fs.mkdir(path)
  }

  if (Array.isArray(path)) {
    if (path.length === 0) {
      return
    } else if (path.length === 1) {
      return ensureFolder(path[0])
    } else {
      await ensureFolder(path[0])
      await ensureFolder(path.slice(1))
    }
  }
}

/**
 * Merges the provided content with a json file
 * @param path The path to the subject json file
 * @param content The content to be applied (as a plain object)
 */
export async function writeJSON(path: string, content: any): Promise<void> {
  let currentFile

  try {
    currentFile = await readJSON<any>(path)
  } catch (e) {
    currentFile = {}
  }

  const strContent = JSON.stringify({ ...currentFile, ...content }, null, 2)

  return fs.outputFile(path, strContent)
}

/**
 * Reads a file and parses it's JSON content
 * @param path The path to the subject json file
 */
export async function readJSON<T>(path: string): Promise<T> {
  const content = await fs.readFile(path, 'utf-8')
  return JSON.parse(content) as T
}

/**
 * Returns true if the directory is empty
 */
export async function isEmptyDirectory(): Promise<boolean> {
  const files = await fs.readdir('.')
  return files.length === 0
}

/**
 * Returns th name of the Home directory in a platform-independent way.
 * @returns `USERPROFILE` or `HOME`
 */
export function getUserHome(): string {
  return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME']
}
