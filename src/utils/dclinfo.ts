import * as path from 'path'
import { readJSON, writeJSON, getUserHome } from './filesystem'

export interface IDCLInfoFile {
  userId: string
  trackStats: boolean
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
export function writeDCLInfo(userId: string, trackStats: boolean) {
  return writeJSON(getDCLInfoPath(), {
    userId,
    trackStats
  })
}
