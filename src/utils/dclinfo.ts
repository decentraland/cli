import * as path from 'path'
import { readJSON, writeJSON } from './filesystem'

export interface IDCLInfoFile {
  userId: string
  trackStats: boolean
}

/**
 * Returns th name of the Home directory in a platform-independent way.
 * @returns `USERPROFILE` or `HOME`
 */
export function getUserHome(): string {
  return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME']
}

/**
 * Returns the path to the `.dclinfo` file located in the local HOME folder
 */
export function getDCLInfoPath(): string {
  return path.resolve(getUserHome(), '.dclinfo')
}

/**
 * Returns the contents of the `.dclinfo` file
 */
export async function getDCLInfo(): Promise<IDCLInfoFile> {
  const filePath = getDCLInfoPath()
  try {
    const file = await readJSON<IDCLInfoFile>(filePath)
    return file
  } catch (e) {
    return null
  }
}

/**
 * Writes the `.dclinfo` file in the HOME directory
 * @param userId The individual identifier for the CLI user
 * @param trackStats Whether or not user data should be collected
 */
export async function writeDCLInfo(userId: string, trackStats: boolean) {
  return writeJSON(getDCLInfoPath(), {
    userId,
    trackStats
  })
}
